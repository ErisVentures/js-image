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
      format: ImageData.RGBA,
    }, imageData)
  }

  static assert(imageData) {
    if (!ImageData.is(imageData)) {
      throw new TypeError('Unexpected image data format')
    }

    return imageData
  }

  static removeAlphaChannel(srcImageData) {
    const dstImageData = Object.assign({}, srcImageData, {hasAlpha: false})

    if (srcImageData.hasAlpha) {
      const numPixels = srcImageData.width * srcImageData.height
      const numChannels = srcImageData.channels - 1
      const rawData = new Uint8Array(numPixels * numChannels)
      for (let i = 0; i < numPixels; i++) {
        for (let j = 0; j < numChannels; j++) {
          rawData[i + j] = srcImageData.data[(i * srcImageData.channels) + j]
        }
      }

      dstImageData.data = rawData
    }

    return dstImageData
  }
}

ImageData.RGB = 'rgb'
ImageData.RGBA = 'rgba'
ImageData.FORMATS = [ImageData.RGB, ImageData.RGBA]

module.exports = ImageData
