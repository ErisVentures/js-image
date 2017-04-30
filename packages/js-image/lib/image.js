const fs = require('fs')
const {promisify} = require('./utils')

const writeFileAsync = promisify(fs.writeFile, fs)

class Image {
  constructor(options) {
    this._options = Object.assign({
      format: 'jpeg',
      formatOptions: {quality: 90},
    }, options)
  }

  format(format, options) {
    if (format !== Image.JPEG && format !== Image.PNG) {
      throw new Error(`Unrecognized format: ${format}`)
    }

    this._options.format = format
    this._options.formatOptions = Object.assign({}, options)
    return this
  }

  toImageData() {
    throw new Error('unimplemented')
  }

  toBuffer() {
    throw new Error('unimplemented')
  }

  toFile(path) {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  static isImageData(obj) {
    if (!obj ||
      !obj.data ||
      typeof obj.width !== 'number' ||
      typeof obj.height !== 'number') {
      return false
    }

    if (typeof obj.channels !== 'number') {
      obj.channels = 4
    }

    if (typeof obj.hasAlpha !== 'boolean') {
      obj.hasAlpha = true
    }

    return obj.data.length === obj.width * obj.height * obj.channels
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

  static from() {
    throw new Error('unimplemented')
  }
}

Image.JPEG = 'jpeg'
Image.PNG = 'png'
module.exports = Image
