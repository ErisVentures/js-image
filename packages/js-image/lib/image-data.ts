export type ImageDataFormat = 'rgb' | 'rgba' | 'b'
export type BufferLike = Buffer|Uint8Array|number[]

export interface ImageData {
  channels: number,
  format: ImageDataFormat,
  width: number,
  height: number,
  data: BufferLike,
}

export class ImageData implements ImageData {
  public static GREYSCALE: ImageDataFormat = 'b'
  public static RGB: ImageDataFormat = 'rgb'
  public static RGBA: ImageDataFormat = 'rgba'

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
    return Object.assign({
      channels: imageData.data.length / (imageData.width * imageData.height),
      format: imageData.channels === 3 ? ImageData.RGB : ImageData.RGBA,
    }, imageData)
  }

  public static assert(imageData: any): ImageData {
    if (!ImageData.is(imageData)) {
      throw new TypeError('Unexpected image data format')
    }

    return imageData
  }

  public static toGreyscale(srcImageData: ImageData): ImageData {
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
}
