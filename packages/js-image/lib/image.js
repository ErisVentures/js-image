const fs = require('fs')
const {promisify} = require('./utils')

const writeFileAsync = promisify(fs.writeFile, fs)

class Image {
  constructor(options) {
    this._options = options
    this._output = {
      format: {type: 'jpeg'},
    }
  }

  format(options) {
    if (typeof options === 'string') {
      options = {type: options}
    }

    if (options.type !== Image.JPEG && options.type !== Image.PNG) {
      throw new Error(`Unrecognized format: ${options.type}`)
    }

    const defaultOpts = options.type === Image.JPEG ? {quality: 90} : {}
    this._output.format = Object.assign(defaultOpts, options)
    return this
  }

  resize(options) {
    if (typeof options.width !== 'number' && typeof options.height !== 'number') {
      throw new TypeError('Must specify a width or height')
    }

    this._output.resize = Object.assign({method: Image.CROP}, options)
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

  static from() {
    throw new Error('unimplemented')
  }
}

// Image formats
Image.JPEG = 'jpeg'
Image.PNG = 'png'

// Image resize methods
Image.AUTO_SIZE = undefined
Image.CONTAIN = 'contain'
Image.COVER = 'cover'
Image.EXACT = 'exact'
Image.CROP = 'crop'

module.exports = Image
