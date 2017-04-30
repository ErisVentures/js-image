class ImageData {
  static probablyIs(obj) {
    if (!obj ||
      !obj.data ||
      typeof obj.width !== 'number' ||
      typeof obj.height !== 'number') {
      return false
    }

    return obj.data.length % obj.width * obj.height === 0
  }

  static is(obj) {
    return ImageData.probablyIs(obj) &&
      typeof obj.channels === 'number' &&
      ImageData.FORMATS.includes(obj.format) &&
      obj.data.length === obj.width * obj.height * obj.channels
  }

  static normalize(imageData) {
    return Object.assign({
      channels: 4,
      format: imageData.channels === 3 ? ImageData.RGB : ImageData.RGBA,
    }, imageData)
  }

  static assert(imageData) {
    if (!ImageData.is(imageData)) {
      throw new TypeError('Unexpected image data format')
    }

    return imageData
  }

  static removeAlphaChannel(srcImageData) {
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

ImageData.RGB = 'rgb'
ImageData.RGBA = 'rgba'
ImageData.FORMATS = [ImageData.RGB, ImageData.RGBA]

module.exports = ImageData
