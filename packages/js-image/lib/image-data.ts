import {ImageDataFormat, BufferLike, IFormatOptions, Pixel} from './types'

/* tslint:disable-next-line */
const jpeg = require('@ouranos/jpeg-js')
/* tslint:disable-next-line */
const PNG = require('pngjs').PNG
/* tslint:disable-next-line */
const imageType = require('image-type')

export class ImageData {
  public static GREYSCALE: ImageDataFormat = 'b'
  public static RGB: ImageDataFormat = 'rgb'
  public static RGBA: ImageDataFormat = 'rgba'

  public channels: number
  public format: ImageDataFormat
  public width: number
  public height: number
  public data: BufferLike

  public static probablyIs(obj: any): boolean {
    if (!obj ||
      !obj.data ||
      typeof obj.width !== 'number' ||
      typeof obj.height !== 'number') {
      return false
    }

    return obj.data.length % obj.width * obj.height === 0
  }

  public static is(obj: any): obj is ImageData {
    return ImageData.probablyIs(obj) &&
      typeof obj.channels === 'number' &&
      (obj.format === ImageData.RGB ||
      obj.format === ImageData.RGBA ||
      obj.format === ImageData.GREYSCALE) &&
      obj.data.length === obj.width * obj.height * obj.channels
  }

  public static normalize(imageData: any): any {
    const channels = imageData.data.length / (imageData.width * imageData.height)

    let format
    switch (channels) {
      case 3:
        format = ImageData.RGB
        break
      case 1:
        format = ImageData.GREYSCALE
        break
      default:
        format = ImageData.RGBA
    }

    return Object.assign({channels, format}, imageData)
  }

  public static assert(imageData: any): ImageData {
    if (!ImageData.is(imageData)) {
      throw new TypeError('Unexpected image data format')
    }

    return imageData
  }

  public static isBorder(imageData: ImageData, x: number, y: number, radius: number = 1): boolean {
    return x - radius < 0 ||
      y - radius < 0 ||
      x + radius >= imageData.width ||
      y + radius >= imageData.height
  }

  public static indexFor(imageData: ImageData, x: number, y: number, channel: number = 0): number {
    x = Math.max(0, Math.min(x, imageData.width - 1))
    y = Math.max(0, Math.min(y, imageData.height - 1))
    return (y * imageData.width + x) * imageData.channels + channel
  }

  public static valueFor(imageData: ImageData, x: number, y: number, channel: number = 0): number {
    return imageData.data[ImageData.indexFor(imageData, x, y, channel)]
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
    imageData: ImageData,
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
    srcArray: number[]|Uint8Array,
    dstArray: number[]|Uint8Array,
    width: number,
    height: number,
    angle: number,
    channels: number = 1,
  ): void {
    const fakeImageData = {width, height, channels} as ImageData
    const cosAngle = Math.cos((360 - angle) * Math.PI / 180)
    const sinAngle = Math.sin((360 - angle) * Math.PI / 180)

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

  public static rotate(srcImageData: ImageData, angle: number): ImageData {
    const dstImageData = Object.assign({}, srcImageData)
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

  public static toGreyscale(srcImageData: ImageData): ImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.format === ImageData.GREYSCALE) {
      return srcImageData
    }

    const dstImageData = Object.assign({}, srcImageData)
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels)
    for (let i = 0; i < numPixels; i++) {
      const red = srcImageData.data[(i * srcImageData.channels) + 0]
      const green = srcImageData.data[(i * srcImageData.channels) + 1]
      const blue = srcImageData.data[(i * srcImageData.channels) + 2]
      // use luminance forumla over regular average
      rawData[i] = Math.round(0.3 * red + 0.59 * green + 0.11 * blue)
    }

    dstImageData.format = ImageData.GREYSCALE
    dstImageData.channels = 1
    dstImageData.data = rawData
    return dstImageData
  }

  public static toRGB(srcImageData: ImageData): ImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.format === ImageData.RGB) {
      return srcImageData
    } else if (srcImageData.format === ImageData.RGBA) {
      return ImageData.removeAlphaChannel(srcImageData)
    }

    const dstImageData = Object.assign({}, srcImageData)
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const dstOffset = i * 3
      rawData[dstOffset + 0] = srcImageData.data[i]
      rawData[dstOffset + 1] = srcImageData.data[i]
      rawData[dstOffset + 2] = srcImageData.data[i]
    }

    dstImageData.format = ImageData.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toRGBA(srcImageData: ImageData): ImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.format === ImageData.RGBA) {
      return srcImageData
    } else if (srcImageData.format === ImageData.GREYSCALE) {
      srcImageData = ImageData.toRGB(srcImageData)
    }

    const dstImageData = Object.assign({}, srcImageData)
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

    dstImageData.format = ImageData.RGBA
    dstImageData.channels = 4
    dstImageData.data = rawData
    return dstImageData
  }

  public static removeAlphaChannel(srcImageData: ImageData): ImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.format !== ImageData.RGBA) {
      return srcImageData
    }

    const dstImageData = Object.assign({}, srcImageData)
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      rawData[i + 0] = srcImageData.data[(i * srcImageData.channels) + 0]
      rawData[i + 1] = srcImageData.data[(i * srcImageData.channels) + 1]
      rawData[i + 2] = srcImageData.data[(i * srcImageData.channels) + 2]
    }

    dstImageData.format = ImageData.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData

    return dstImageData
  }

  public static from(bufferLike: BufferLike): Promise<ImageData> {
    const type = imageType(bufferLike) || {mime: 'unknown'}

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

  public static toBuffer(imageData: ImageData, options?: IFormatOptions): Promise<BufferLike> {
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
}
