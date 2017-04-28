const sharp = require('sharp')
const Image = require('./image')

class NodeImage extends Image {
  constructor(image, options) {
    super(options)
    this._image = image
  }

  _setFormat(image) {
    if (this._options.format === Image.JPEG) {
      return image.jpeg(this._options.formatOptions)
    } else if (this._options.format === Image.PNG) {
      return image.png()
    } else {
      throw new Error(`Unsupported format: ${this._options.format}`)
    }
  }

  toBuffer() {
    let image = this._image
    image = this._setFormat(image)
    return image.toBuffer()
  }

  static from(bufferOrImageData, options) {
    let image
    if (Image.isImageData(bufferOrImageData)) {
      image = sharp(bufferOrImageData.data, {
        raw: {
          channels: 4,
          width: bufferOrImageData.width,
          height: bufferOrImageData.height,
        },
      })
    } else if (Buffer.isBuffer(bufferOrImageData)) {
      image = sharp(bufferOrImageData)
    } else {
      throw new TypeError('Must be Buffer of image data')
    }

    return new NodeImage(image, options)
  }
}

module.exports = NodeImage
