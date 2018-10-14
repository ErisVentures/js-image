import {
  Colorspace,
  BufferLike,
  IPixel,
  ColorChannel,
  IFormatOptions,
  ICalibrationProfile,
  IPixelCoordinate,
  IGreyscalePixel,
  MapPixelFn,
} from './types'
import {hasWASM, getWASM} from './utils/env'

/* tslint:disable-next-line */
const jpeg = require('jpeg-js')
/* tslint:disable-next-line */
const PNG = require('pngjs').PNG
/* tslint:disable-next-line */
const fileType = require('file-type')

// Use standard sRGB conversion numbers by default
// https://en.wikipedia.org/wiki/SRGB#The_sRGB_gamut
export const defaultCalibrationProfile: ICalibrationProfile = {
  xRed: 0.4124,
  yRed: 0.2126,
  zRed: 0.0193,
  xGreen: 0.3576,
  yGreen: 0.7152,
  zGreen: 0.1192,
  xBlue: 0.1805,
  yBlue: 0.0722,
  zBlue: 0.9505,
}

export interface BrowserImageData {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface IProximityAdjustment {
  filterChannels: ColorChannel[]
  filterChannelCenters: number[]
  filterChannelRanges: number[]
  targetChannel: ColorChannel
  targetIntensity: number
}

// TODO: fork this definition based on colorspace
export interface IAnnotatedImageData {
  channels: number
  colorspace: Colorspace
  width: number
  height: number
  data: BufferLike
}

export enum ProximitySmoothingMethod {
  Linear = 'linear',
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
        obj.colorspace === Colorspace.HCL ||
        obj.colorspace === Colorspace.YCbCr ||
        obj.colorspace === Colorspace.XYY ||
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

  public static getChannelRange(channel: ColorChannel): number {
    switch (channel) {
      case ColorChannel.Red:
      case ColorChannel.Green:
      case ColorChannel.Blue:
      case ColorChannel.Alpha:
      case ColorChannel.Luminance255:
      case ColorChannel.ChromaRed:
      case ColorChannel.ChromaBlue:
        return 255
      case ColorChannel.Hue:
        return 360
      case ColorChannel.Saturation:
      case ColorChannel.Luminance:
      case ColorChannel.Lightness:
      case ColorChannel.Chroma:
      case ColorChannel.X:
      case ColorChannel.Y:
      case ColorChannel.Z:
      case ColorChannel.x:
      case ColorChannel.y:
        return 1
      default:
        throw new Error(`Unknown channel ${channel}`)
    }
  }

  public static clip(value: number, channel: ColorChannel = ColorChannel.Red): number {
    switch (channel) {
      case ColorChannel.Hue:
        let hue = Math.round(value)
        while (hue < 0) hue += 360
        return hue % 360
      default:
        const max = ImageData.getChannelRange(channel)
        const rounded = max === 1 ? value : Math.round(value)
        // Manually do a min/max to clip, believe it or not this became bottleneck
        return rounded < 0 ? 0 : rounded > max ? max : rounded
    }
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
    const xMax = imageData.width - 1
    const yMax = imageData.height - 1
    // Manually do a min/max to clip, believe it or not this became bottleneck
    x = x < 0 ? 0 : x > xMax ? xMax : x
    y = y < 0 ? 0 : y > yMax ? yMax : y
    return (y * imageData.width + x) * imageData.channels + channel
  }

  public static pixelFor(imageData: IAnnotatedImageData, x: number, y: number): IPixel {
    const {colorspace, data, channels} = imageData
    const index = ImageData.indexFor(imageData, x, y)
    const values = [...data.slice(index, index + channels)]
    return {x, y, index, values, colorspace}
  }

  public static valueFor(
    imageData: IAnnotatedImageData,
    x: number,
    y: number,
    channel: number = 0,
  ): number {
    return imageData.data[ImageData.indexFor(imageData, x, y, channel)]
  }

  public static channelsFor(colorspace: Colorspace): ColorChannel[] {
    const {
      Hue,
      Saturation,
      Lightness,
      Red,
      Green,
      Blue,
      Alpha,
      Luminance255,
      Luminance,
      Chroma,
      ChromaBlue,
      ChromaRed,
      x,
      y,
      X,
      Y,
      Z,
    } = ColorChannel

    switch (colorspace) {
      case Colorspace.Greyscale:
        return [Luminance255]
      case Colorspace.HSL:
        return [Hue, Saturation, Lightness]
      case Colorspace.HCL:
        return [Hue, Chroma, Luminance]
      case Colorspace.YCbCr:
        return [Luminance255, ChromaBlue, ChromaRed]
      case Colorspace.XYZ:
        return [X, Y, Z]
      case Colorspace.XYY:
        return [x, y, Y]
      default:
        return [Red, Green, Blue, Alpha]
    }
  }

  public static channelFor(imageData: IAnnotatedImageData, channel: number): ColorChannel {
    return ImageData.channelsFor(imageData.colorspace)[channel]
  }

  public static getOffsetForAngle(angle: number): IPixelCoordinate {
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
  ): IGreyscalePixel[] {
    const offset = ImageData.getOffsetForAngle(angle)
    const pixels: IGreyscalePixel[] = []
    for (let i = -radius; i <= radius; i++) {
      if (i === 0) {
        continue
      }

      const x = srcX + offset.x * i
      const y = srcY + offset.y * i
      const index = ImageData.indexFor(imageData, x, y)
      pixels.push({x, y, index, colorspace: Colorspace.Greyscale, values: [imageData.data[index]]})
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

  public static proximityTransform(
    imageData: IAnnotatedImageData,
    adjustments: IProximityAdjustment[],
  ): IAnnotatedImageData {
    const colorChannels = ImageData.channelsFor(imageData.colorspace)

    function computeDistances(
      {filterChannels, filterChannelCenters, filterChannelRanges}: IProximityAdjustment,
      offset: number,
    ): number[] {
      const distances: number[] = []
      let totalDist = 0

      for (let i = 0; i < colorChannels.length; i++) {
        const channel = colorChannels[i]
        const filterChannelIndex = filterChannels.indexOf(channel)
        if (filterChannelIndex === -1) continue

        const value = imageData.data[offset + i]

        let distance = Math.abs(filterChannelCenters[filterChannelIndex] - value)
        if (channel === ColorChannel.Hue) {
          distance = distance % 360
          distance = Math.min(distance, 360 - distance)
        }

        distance = distance / filterChannelRanges[filterChannelIndex]
        distance = Math.min(distance, 1)
        distances.push(distance)
        totalDist += distance
      }

      if (distances.length - totalDist < 0.05) return []

      return distances
    }

    function computeMultiplier(distances: number[]): number {
      let multiplier = 0
      if (distances.length === 1) {
        multiplier = Math.cos((distances[0] * Math.PI) / 2)
      } else {
        let totalDistance = 0
        for (const distance of distances) {
          totalDistance += distance * distance
        }

        multiplier = totalDistance > 1 ? 0 : 1 - Math.sqrt(totalDistance)
      }

      return multiplier
    }

    function updateTargetChannel(
      {targetChannel, targetIntensity}: IProximityAdjustment,
      offset: number,
      multiplier: number,
    ): void {
      for (let i = 0; i < colorChannels.length; i++) {
        if (colorChannels[i] !== targetChannel) continue
        const value = imageData.data[offset + i]
        imageData.data[offset + i] = ImageData.clip(
          value + multiplier * targetIntensity,
          targetChannel,
        )
      }
    }

    for (let x = 0; x < imageData.width; x++) {
      for (let y = 0; y < imageData.height; y++) {
        const offset = ImageData.indexFor(imageData, x, y)

        for (let i = 0; i < adjustments.length; i++) {
          const adjustment = adjustments[i]
          const distances = computeDistances(adjustment, offset)
          if (!distances.length) continue

          const multiplier = computeMultiplier(distances)
          updateTargetChannel(adjustment, offset, multiplier)
        }
      }
    }

    return imageData
  }

  public static mapPixels(
    imageData: IAnnotatedImageData,
    fns: MapPixelFn | MapPixelFn[],
  ): IAnnotatedImageData {
    if (!Array.isArray(fns)) fns = [fns]
    if (fns.length === 0) return imageData

    const channels = ImageData.channelsFor(imageData.colorspace)
    const isUint8 =
      [Colorspace.RGBA, Colorspace.RGB, Colorspace.Greyscale, Colorspace.YCbCr].indexOf(
        imageData.colorspace,
      ) >= 0

    const {width, height} = imageData
    const data: BufferLike = isUint8
      ? new Uint8Array(imageData.width * imageData.height * imageData.channels)
      : []
    const output = {...imageData, width, height, data}

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = ImageData.pixelFor(imageData, x, y)
        for (const fn of fns) {
          pixel.values = fn(pixel)
        }

        for (let i = 0; i < imageData.channels; i++) {
          data[pixel.index + i] = ImageData.clip(pixel.values[i], channels[i])
        }
      }
    }

    return output
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

      rawData[offset + 0] = ImageData.clip((hue / 360) * 255)
      rawData[offset + 1] = ImageData.clip(saturation * 255)
      rawData[offset + 2] = ImageData.clip(lightness * 255)
    }

    dstImageData.colorspace = ImageData.HSL
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  private static _HSLToRGB(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = new Uint8Array(numPixels * 3)
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const h = (360 * srcImageData.data[offset]) / 255
      const s = srcImageData.data[offset + 1] / 255
      const l = srcImageData.data[offset + 2] / 255

      // We know that...
      // S = (maxColor - minColor) / (1 - |2L - 1|)
      // maxColor = minColor + S * (1 - |2L - 1|)

      // And we also know that...
      // L = (maxColor + minColor) / 2
      // maxColor = 2L - minColor

      // Therefore...
      // 2L - minColor = minColor + S * (1 - |2L - 1|)
      // minColor = L - S * (1 - |2L - 1|) / 2

      const minColor = l - (s * (1 - Math.abs(2 * l - 1))) / 2
      const maxColor = 2 * l - minColor
      const spread = maxColor - minColor

      let r = 0
      let g = 0
      let b = 0

      if (h <= 60) {
        // R > G > B
        // H = 60 * (G - B) / spread
        // G = H * spread / 60 + B
        r = maxColor
        g = (h * spread) / 60 + minColor
        b = minColor
      } else if (h <= 120) {
        // G > R > B
        // H = 60 * (B - R) / spread + 120
        // R = -(H - 120) * spread / 60 + B
        r = -((h - 120) * spread) / 60 + minColor
        g = maxColor
        b = minColor
      } else if (h <= 180) {
        // G > B > R
        // H = 60 * (B - R) / spread + 120
        // B = (H - 120) * spread / 60 + R
        r = minColor
        g = maxColor
        b = ((h - 120) * spread) / 60 + minColor
      } else if (h <= 240) {
        // B > G > R
        // H = 60 * (R - G) / spread + 240
        // G = -(H - 240) * spread / 60 + R
        r = minColor
        g = -((h - 240) * spread) / 60 + minColor
        b = maxColor
      } else if (h <= 300) {
        // B > R > G
        // H = 60 * (R - G) / spread + 240
        // R = (H - 240) * spread / 60 + G
        r = ((h - 240) * spread) / 60 + minColor
        g = minColor
        b = maxColor
      } else {
        // R > B > G
        // H = 60 * (G - B) / spread + 360
        // B = -(H - 360) * spread / 60 + G
        r = maxColor
        g = minColor
        b = -((h - 360) * spread) / 60 + minColor
      }

      rawData[offset + 0] = ImageData.clip(r * 255)
      rawData[offset + 1] = ImageData.clip(g * 255)
      rawData[offset + 2] = ImageData.clip(b * 255)
    }

    dstImageData.colorspace = Colorspace.RGB
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toHCL(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    ImageData.assert(srcImageData)
    if (srcImageData.colorspace === Colorspace.HCL) {
      return srcImageData
    } else {
      srcImageData = ImageData.toXYY(srcImageData)
    }

    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = []
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      // Convert xyY into polar coordinates, https://en.wikipedia.org/wiki/HCL_color_space#Overview
      const x = srcImageData.data[offset]
      const y = srcImageData.data[offset + 1]
      const Y = srcImageData.data[offset + 2]

      // Use sRGB white point, https://en.wikipedia.org/wiki/SRGB#The_sRGB_gamut
      const xOrigin = 0.3127
      const yOrigin = 0.329

      const xCoord = x - xOrigin
      const yCoord = y - yOrigin

      const rCoord = Math.sqrt(xCoord * xCoord + yCoord * yCoord)
      let theta = (Math.atan(yCoord / xCoord) * 180) / Math.PI

      if (xCoord < 0 && yCoord > 0) theta += 180
      if (xCoord < 0 && yCoord < 0) theta += 180
      if (xCoord > 0 && yCoord < 0) theta += 360

      rawData[offset + 0] = theta
      rawData[offset + 1] = rCoord
      rawData[offset + 2] = Y
    }

    dstImageData.colorspace = Colorspace.HCL
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  private static _HCLToXYY(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    const dstImageData = {...srcImageData}
    const numPixels = srcImageData.width * srcImageData.height
    const rawData = []

    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      // Convert HCL back into cartesian coordinates, https://en.wikipedia.org/wiki/HCL_color_space#Overview
      const hue = srcImageData.data[offset]
      const chroma = srcImageData.data[offset + 1]
      const Y = srcImageData.data[offset + 2]

      // Use sRGB white point, https://en.wikipedia.org/wiki/SRGB#The_sRGB_gamut
      const xOrigin = 0.3127
      const yOrigin = 0.329

      const xCoord = Math.cos((hue * Math.PI) / 180) * chroma
      const yCoord = Math.sin((hue * Math.PI) / 180) * chroma

      rawData[offset + 0] = xCoord + xOrigin
      rawData[offset + 1] = yCoord + yOrigin
      rawData[offset + 2] = Y
    }

    dstImageData.colorspace = Colorspace.XYY
    dstImageData.channels = 3
    dstImageData.data = rawData
    return dstImageData
  }

  public static toXYZ(
    srcImageData: IAnnotatedImageData,
    calibrationProfile: ICalibrationProfile = defaultCalibrationProfile,
  ): IAnnotatedImageData {
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
      const X =
        calibrationProfile.xRed * rLinear +
        calibrationProfile.xGreen * gLinear +
        calibrationProfile.xBlue * bLinear
      const Y =
        calibrationProfile.yRed * rLinear +
        calibrationProfile.yGreen * gLinear +
        calibrationProfile.yBlue * bLinear
      const Z =
        calibrationProfile.zRed * rLinear +
        calibrationProfile.zGreen * gLinear +
        calibrationProfile.zBlue * bLinear

      rawData[offset + 0] = X
      rawData[offset + 1] = Y
      rawData[offset + 2] = Z
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

  public static toXYY(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    const dstImageData = {...ImageData.toXYZ(srcImageData)}
    dstImageData.data = dstImageData.data.slice()

    const numPixels = srcImageData.width * srcImageData.height
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const X = dstImageData.data[offset + 0]
      const Y = dstImageData.data[offset + 1]
      const Z = dstImageData.data[offset + 2]
      const XYZ = X + Y + Z

      dstImageData.data[offset + 0] = X / XYZ
      dstImageData.data[offset + 1] = Y / XYZ
      dstImageData.data[offset + 2] = Y
    }

    dstImageData.colorspace = Colorspace.XYY
    return dstImageData
  }

  private static _XYYToRGB(srcImageData: IAnnotatedImageData): IAnnotatedImageData {
    const dstImageData = {...srcImageData}
    dstImageData.data = dstImageData.data.slice()
    const numPixels = srcImageData.width * srcImageData.height
    for (let i = 0; i < numPixels; i++) {
      const offset = i * 3
      const x = dstImageData.data[offset + 0]
      const y = dstImageData.data[offset + 1]
      const Y = dstImageData.data[offset + 2]
      const XYZ = Y / y
      const X = x * XYZ

      dstImageData.data[offset + 0] = X
      dstImageData.data[offset + 1] = Y
      dstImageData.data[offset + 2] = XYZ - Y - X
    }

    dstImageData.colorspace = Colorspace.XYZ
    return ImageData._XYZToRGB(dstImageData)
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

    if (hasWASM()) {
      const {wasmModule} = getWASM()

      const byteSize = numPixels * 3
      const pointer = wasmModule.instance.exports.alloc(byteSize)
      const rawData = new Uint8Array(wasmModule.instance.exports.memory.buffer, pointer, byteSize)
      for (let i = 0; i < srcImageData.height * srcImageData.width * srcImageData.channels; i++) {
        rawData[i] = srcImageData.data[i]
      }

      wasmModule.instance.exports.toYCbCr(pointer, numPixels)
      dstImageData.data = new Uint8Array(rawData)
      wasmModule.instance.exports.dealloc(pointer, byteSize)
    } else {
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
      dstImageData.data = rawData
    }

    dstImageData.colorspace = Colorspace.YCbCr
    dstImageData.channels = 3
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
      return ImageData._HSLToRGB(srcImageData)
    } else if (srcImageData.colorspace === Colorspace.HCL) {
      return ImageData._XYYToRGB(ImageData._HCLToXYY(srcImageData))
    } else if (srcImageData.colorspace === Colorspace.YCbCr) {
      return ImageData._YCbCrToRGB(srcImageData)
    } else if (srcImageData.colorspace === Colorspace.XYZ) {
      return ImageData._XYZToRGB(srcImageData)
    } else if (srcImageData.colorspace === Colorspace.XYY) {
      return ImageData._XYYToRGB(srcImageData)
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

    imageData = ImageData.toRGBA(imageData)
    const clamped = new Uint8ClampedArray(imageData.data)
    return new (window as any).ImageData(clamped, imageData.width, imageData.height)
  }
}
