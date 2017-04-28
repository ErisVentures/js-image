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

  toBuffer() {
    throw new Error('unimplemented')
  }

  toFile(path) {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  static isImageData(obj) {
    if (!obj || !obj.data || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
      return false
    }

    return obj.data.length === obj.width * obj.height * 4
  }

  static from() {
    throw new Error('unimplemented')
  }
}

Image.JPEG = 'jpeg'
Image.PNG = 'png'
module.exports = Image
