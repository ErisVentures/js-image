import {Colorspace, BufferLike, Pixel, ColorChannel, IFormatOptions} from './types'

/* tslint:disable-next-line */
const jpeg = require('jpeg-js')
/* tslint:disable-next-line */
const PNG = require('pngjs').PNG
/* tslint:disable-next-line */
const fileType = require('file-type')

export interface BrowserImageData {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface IAnnotatedImageData {
  channels: number
  colorspace: Colorspace
  width: number
  height: number
  data: BufferLike
}

export class ImageData {
  public static GREYSCALE: Colorspace = Colorspace.Greyscale
  public static RGB: Colorspace = Colorspace.RGB
  public static RGBA: Colorspace = Colorspace.RGBA
  public static HSL: Colorspace = Colorspace.HSL
  public static YCBCR: Colorspace = Colorspace.YCbCr

  public static probablyIs(obj: any): boolean {
    if (!obj || !obj.data || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
      return false
    }

    return (obj.data.length % obj.width) * obj.height === 0
  }

  public static is(obj: any): obj is IAnnotatedImageData {
    return (
      ImageData.probablyIs(obj) &&
      typeof obj.channels === 'number' &&
      (obj.colorspace === Colorspace.RGB ||
        obj.colorspace === Colorspace.RGBA ||
        obj.colorspace === Colorspace.Greyscale ||
        obj.colorspace === Colorspace.HSL ||
        obj.colorspace === Colorspace.YCbCr ||
        obj.colorspace === Colorspace.XYZ) &&
      obj.data.length === obj.width * obj.height * obj.channels
    )
  }

  public static normalize(imageData: any): any {
    const channels = imageData.data.length / (imageData.width * imageData.height)

    let colorspace
    switch (channels) {
      case 3:
        colorspace = Colorspace.RGB
        break
      case 1:
        colorspace = Colorspace.Greyscale
        break
      default:
        colorspace = Colorspace.RGBA
    }

    return {channels, colorspace, ...imageData}
  }

  public static assert(imageData: any, colorspaces?: Colorspace[]): IAnnotatedImageData {
    if (!ImageData.is(imageData)) {
      throw new TypeError('Unexpected image data')
    }

    if (colorspaces && colorspaces.indexOf(imageData.colorspace) === -1) {
      const expected = colorspaces.join(' or ')
      const actual = imageData.colorspace
      throw new TypeError(`Expected ${expected} colorspace but found ${actual}`)
    }

    return imageData
  }

  public static clip(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)))
  }

  public static isBorder(
    imageData: IAnnotatedImageData,
    x: number,
    y: number,
    radius: number = 1,
  ): boolean {
    return (
      x - radius < 0 ||
      y - radius < 0 ||
      x + radius >= imageData.width ||
      y + radius >= imageData.height
    )
  }

  public static indexFor(
    imageData: IAnnotatedImageData,
    x: number,
    y: number,
    channel: number = 0,
  ): number {
    x = Math.max(0, Math.min(x, imageData.width - 1))
    y = Math.max(0, Math.min(y, imageData.height - 1))
    return (y * imageData.width + x) * imageData.channels + channel
  }

  public static valueFor(
    imageData: IAnnotatedImageData,
    x: number,
    y: number,
    channel: number = 0,
  ): number {
    return imageData.data[ImageData.indexFor(imageData, x, y, channel)]
  }

  public static channelFor(imageData: IAnnotatedImageData, channel: number): ColorChannel {
    const {
      Hue,
      Saturation,
      Lightness,
      Red,
      Green,
      Blue,
      Alpha,
      Luma,
      ChromaBlue,
      ChromaRed,
      X,
      Y,
      Z,
    } = ColorChannel

    switch (imageData.colorspace) {
      case Colorspace.Greyscale:
        return Luma
      case Colorspace.HSL:
        return [Hue, Saturation, Lightness][channel]
      case Colorspace.YCbCr:
        return [Luma, ChromaBlue, ChromaRed][channel]
      case Colorspace.XYZ:
        return [X, Y, Z][channel]
      default:
        return [Red, Green, Blue, Alpha][channel]
    }
  }

  public static getOffsetForAngle(angle: number): Pixel {
    switch (angle) {
      case 0:
        return {x: 1, y: 0}
      case 45:
        return {x: -1, y: 1}
      case 90:
        return {x: 0, y: 1}
      case 135:
        return {x: 1, y: 1}
      default:
        throw new Error(`invalid angle: ${angle}`)
    }
  }

  public static getPixelsForAngle(
    imageData: IAnnotatedImageData,
    srcX: number,
    srcY: number,
    angle: number,
    radius: number = 1,
  ): Pixel[] {
    const offset = ImageData.getOffsetForAngle(angle)
    const pixels: Pixel[] = []
    for (let i = -radius; i <= radius; i++) {
      if (i === 0) {
        continue
      }

      const x = srcX + offset.x * i
      const y = srcY + offset.y * i
      const index = ImageData.indexFor(imageData, x, y)
      pixels.push({x, y, index, value: imageData.data[index]})
    }

    return pixels
  }

  public static rotateArray(
    srcArray: number[] | Uint8Array,
    dstArray: number[] | Uint8Array,
    width: number,
    height: number,
    angle: number,
    channels: number = 1,
  ): void {
    // tslint:disable-next-line
    const fakeImageData = {width, height, channels} as IAnnotatedImageData
    const cosAngle = Math.cos(((360 - angle) * Math.PI) / 180)
    const sinAngle = Math.sin(((360 - angle) * Math.PI) / 180)

    const originX = (width - 1) / 2
    const originY = (height - 1) / 2
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const xRelative = x - originX
        const yRelative = y - originY
        const xPrimeRelative = xRelative * cosAngle - yRelative * sinAngle
        const yPrimeRelative = xRelative * sinAngle + yRelative * cosAngle

        const xPrime = Math.round(xPrimeRelative + originX)
        const yPrime = Math.round(yPrimeRelative + originY)
        if (ImageData.isBorder(fakeImageData, xPrime, yPrime, 0)) {
          continue
        }

        const srcIndex = ImageData.indexFor(fakeImageData, x, y)
        const dstIndex = ImageData.indexFor(fakeImageData, xPrime, yPrime)
        for (let channel = 0; channel < channels; channel++) {
          const value = srcArray[srcIndex + channel]
          dstArray[dstIndex + channel] = value
        }
      }
    }
  }

  public static rotate(srcImageData: IAnnotatedImageData, angle: number): IAnnotatedImageData {
    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const dstData = new Uint8Array(numPixels * srcImageData.channels)

    ImageData.rotateArray(
      srcImageData.data,
      dstData,
      srcImageData.width,
      srcImageData.height,
      angle,
      srcImageData.channels,
    )

    dstImageData.data = dstData
    return dstImageData
  }

  public static toGreyscale(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === Colorspace.Greyscale) {
      return srcImageData
    } else if (srcImageData.colorspace === ImageData.HSL) {
      srcImageData = ImageData.toRGB(srcImageData)
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels)
    for (let i = 0; i < numPixels; i++) {
      const red = srcImageData.data[i * srcImageData.channels + 0]
      const green = srcImageData.data[i * srcImageData.channels + 1]
      const blue = srcImageData.data[i * srcImageData.channels + 2]
      // use luminance forumla over regular average
      // see https://en.wikipedia.org/wiki/YCbCr#JPEG_conversion
      rawData[i] = Math.round(0.3 * red + 0.59 * green + 0.11 * blue)
    }

    dstImageData.colorspace = Colorspace.Greyscale
    dstImageData.channels = 1
    dstImageData.data = rawData
    return dstImageData
  }

  public static toHSL(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === ImageData.HSL) {
      return srcImageData
    } else {
      srcImageData = ImageData.toRGB(srcImageData)
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const r = srcImageData.data[offset] / 255
      const g = srcImageData.data[offset + 1] / 255
      const b = srcImageData.data[offset + 2] / 255
      const min = Math.min(r, g, b)
      const max = Math.max(r, g, b)
      const delta = max - min
      const lightness = (max + min) / 2

      let hue = 0
      let saturation = 0
      if (delta) {
        saturation = delta / (1 - Math.abs(2 * lightness - 1))
        if (max === r) {
          hue = (360 + (60 * (g - b)) / delta) % 360
        } else if (max === g) {
          hue = 60 * ((b - r) / delta + 2)
        } else {
          hue = 60 * ((r - g) / delta + 4)
        }
      }

      rawData[offset + 0] = Math.round((255 * hue) / 360)
      rawData[offset + 1] = Math.round(255 * saturation)
      rawData[offset + 2] = Math.round(255 * lightness)
    }

    dstImageData.colorspace = ImageData.HSL
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toXYZ(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === Colorspace.YCbCr) {
      return srcImageData
    } else {
      srcImageData = ImageData.toRGB(srcImageData)
    }

    const gammaCorrect = (c: number) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = []
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const rLinear = gammaCorrect(srcImageData.data[offset] / 255)
      const gLinear = gammaCorrect(srcImageData.data[offset + 1] / 255)
      const bLinear = gammaCorrect(srcImageData.data[offset + 2] / 255)

      // From https://en.wikipedia.org/wiki/SRGB#Specification_of_the_transformation
      rawData[offset + 0] = 0.4124 * rLinear + 0.3576 * gLinear + 0.1805 * bLinear
      rawData[offset + 1] = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
      rawData[offset + 2] = 0.0193 * rLinear + 0.1192 * gLinear + 0.9505 * bLinear
    }

    dstImageData.colorspace = Colorspace.XYZ
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  private static _XYZToRGB(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    const gammaCorrect = (c: number) =>
      c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055

    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const x = srcImageData.data[offset]
      const y = srcImageData.data[offset + 1]
      const z = srcImageData.data[offset + 2]

      const rLinear = 3.2406 * x - 1.5372 * y - 0.4986 * z
      const gLinear = -0.9689 * x + 1.8758 * y + 0.0415 * z
      const bLinear = 0.0557 * x - 0.204 * y + 1.057 * z

      // From https://en.wikipedia.org/wiki/SRGB#Specification_of_the_transformation
      rawData[offset + 0] = ImageData.clip(gammaCorrect(rLinear) * 255)
      rawData[offset + 1] = ImageData.clip(gammaCorrect(gLinear) * 255)
      rawData[offset + 2] = ImageData.clip(gammaCorrect(bLinear) * 255)
    }

    dstImageData.colorspace = Colorspace.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toYCbCr(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === Colorspace.YCbCr) {
      return srcImageData
    } else {
      srcImageData = ImageData.toRGB(srcImageData)
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const r = srcImageData.data[offset]
      const g = srcImageData.data[offset + 1]
      const b = srcImageData.data[offset + 2]
      // From https://en.wikipedia.org/wiki/YCbCr#JPEG_conversion
      rawData[offset + 0] = ImageData.clip(0.0 + 0.299 * r + 0.587 * g + 0.114 * b)
      rawData[offset + 1] = ImageData.clip(128 - 0.169 * r - 0.331 * g + 0.501 * b)
      rawData[offset + 2] = ImageData.clip(128 + 0.501 * r - 0.419 * g - 0.081 * b)
    }

    dstImageData.colorspace = Colorspace.YCbCr
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  private static _YCbCrToRGB(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const y = srcImageData.data[offset]
      const cb = srcImageData.data[offset + 1]
      const cr = srcImageData.data[offset + 2]

      // From https://en.wikipedia.org/wiki/YCbCr#JPEG_conversion
      rawData[offset + 0] = ImageData.clip(y + 1.402 * (cr - 128))
      rawData[offset + 1] = ImageData.clip(y - 0.344 * (cb - 128) - 0.714 * (cr - 128))
      rawData[offset + 2] = ImageData.clip(y + 1.772 * (cb - 128))
    }

    dstImageData.colorspace = Colorspace.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toRGB(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === Colorspace.RGB) {
      return srcImageData
    } else if (srcImageData.colorspace === Colorspace.RGBA) {
      return ImageData.removeAlphaChannel(srcImageData)
    } else if (srcImageData.colorspace === ImageData.HSL) {
      throw new TypeError('Cannot convert HSL to RGB')
    } else if (srcImageData.colorspace === Colorspace.YCbCr) {
      return ImageData._YCbCrToRGB(srcImageData)
    } else if (srcImageData.colorspace === Colorspace.XYZ) {
      return ImageData._XYZToRGB(srcImageData)
    } else if (srcImageData.colorspace !== Colorspace.Greyscale) {
      throw new Error('Image data was not greyscale')
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const dstOffset = i * 3
      rawData[dstOffset + 0] = srcImageData.data[i]
      rawData[dstOffset + 1] = srcImageData.data[i]
      rawData[dstOffset + 2] = srcImageData.data[i]
    }

    dstImageData.colorspace = Colorspace.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toRGBA(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === Colorspace.RGBA) {
      return srcImageData
    } else {
      srcImageData = ImageData.toRGB(srcImageData)
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 4)
    for (let i = 0; i < numPixels; i++) {
      const srcOffset = i * 3
      const dstOffset = i * 4
      rawData[dstOffset + 0] = srcImageData.data[srcOffset + 0]
      rawData[dstOffset + 1] = srcImageData.data[srcOffset + 1]
      rawData[dstOffset + 2] = srcImageData.data[srcOffset + 2]
      rawData[dstOffset + 3] = 255
    }

    dstImageData.colorspace = Colorspace.RGBA
    dstImageData.channels = 4
    dstImageData.data = rawData
    return dstImageData
  }

  public static toColorspace(
    srcImageData: IAnnotatedImageData,
    colorspace: Colorspace,
  ): IAnnotatedImageData {
    switch (colorspace) {
      case Colorspace.Greyscale:
        return ImageData.toGreyscale(srcImageData)
      case Colorspace.HSL:
        return ImageData.toHSL(srcImageData)
      case Colorspace.YCbCr:
        return ImageData.toYCbCr(srcImageData)
      case Colorspace.RGB:
        return ImageData.toRGB(srcImageData)
      case Colorspace.RGBA:
        return ImageData.toRGBA(srcImageData)
      default:
        throw new Error(`Unrecognized colorspace '${colorspace}'`)
    }
  }

  public static removeAlphaChannel(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace !== Colorspace.RGBA) {
      return srcImageData
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const srcOffset = i * 4
      const dstOffset = i * 3
      rawData[dstOffset + 0] = srcImageData.data[srcOffset + 0]
      rawData[dstOffset + 1] = srcImageData.data[srcOffset + 1]
      rawData[dstOffset + 2] = srcImageData.data[srcOffset + 2]
    }

    dstImageData.colorspace = Colorspace.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData

    return dstImageData
  }

  public static from(bufferLike: BufferLike): Promise<IAnnotatedImageData> {
    const type = fileType(bufferLike) || {mime: 'unknown'}

    let imageData
    switch (type.mime) {
      case 'image/jpeg':
        imageData = jpeg.decode(bufferLike, true)
        break
      case 'image/png':
        imageData = PNG.sync.read(bufferLike)
        break
      default:
        return Promise.reject(new TypeError(`Unrecognized mime type: ${type.mime}`))
    }

    return Promise.resolve(imageData).then(ImageData.normalize)
  }

  public static toBuffer(
    imageData: IAnnotatedImageData,
    options?: IFormatOptions,
  ): Promise<BufferLike> {
    const type = (options && options.type) || 'jpeg'

    let buffer
    switch (type) {
      case 'jpeg':
        const quality = (options && options.quality) || 90
        buffer = jpeg.encode(ImageData.toRGBA(imageData), quality).data
        break
      case 'png':
        buffer = PNG.sync.write(ImageData.toRGBA(imageData))
        break
      default:
        return Promise.reject(new TypeError(`Unrecognized output type: ${type}`))
    }

    return Promise.resolve(buffer)
  }

  public static toBrowserImageData(imageData: IAnnotatedImageData): BrowserImageData {
    // tslint:disable-next-line
    if (typeof window !== 'object' || typeof (window as any).ImageData !== 'function') {
      throw new Error('toBrowserImageData must be called in browser context')
    }

    const clamped = new Uint8ClampedArray(imageData.data)
    return new (window as any).ImageData(clamped, imageData.width, imageData.height)
  }
}
