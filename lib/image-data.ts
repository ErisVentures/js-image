export type ImageDataFormat = 'rgb' | 'rgba'
export type BufferLike = Buffer|Uint8Array|number[]

export interface ImageData {
  channels: number,
  format: ImageDataFormat,
  width: number,
  height: number,
  data: BufferLike,
}

export class ImageData implements ImageData {
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
      (obj.format === ImageData.RGB || obj.format === ImageData.RGBA) &&
      obj.data.length === obj.width * obj.height * obj.channels
  }

  public static normalize(imageData: any): any {
    return Object.assign({
      channels: 4,
      format: imageData.channels === 3 ? ImageData.RGB : ImageData.RGBA,
    }, imageData)
  }

  public static assert(imageData: any): ImageData {
    if (!ImageData.is(imageData)) {
      throw new TypeError('Unexpected image data format')
    }

    return imageData
  }

  public static removeAlphaChannel(srcImageData: ImageData): ImageData {
    ImageData.assert(srcImageData)
    const dstImageData = Object.assign({}, srcImageData)

    if (srcImageData.format === ImageData.RGBA) {
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
    }

    return dstImageData
  }
}
