class Image {
  constructor(options) {
    this._options = Object.assign({
      format: 'jpeg',
      formatOptions: {quality: 90},
    }, options)
  }

  format(format, options) {
    this._options.format = format
    this._options.formatOptions = Object.assign({}, options)
    return this
  }

  static isImageData(obj) {
    if (!obj || !obj.data || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
      return false
    }

    return obj.data.length === obj.width * obj.height * 4
  }
}

module.exports = Image
