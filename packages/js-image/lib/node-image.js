const sharp = require('sharp')
const Image = require('./image')

class SharpImage {
  static from(bufferOrImageData) {
    if (Image.isImageData(bufferOrImageData)) {
      const imageData = Image.removeAlphaChannel(bufferOrImageData)
      return sharp(Buffer.from(imageData.data), {
        raw: {
          channels: 3,
          width: imageData.width,
          height: imageData.height,
        },
      })
    } else if (Buffer.isBuffer(bufferOrImageData)) {
      return sharp(bufferOrImageData)
    } else {
      throw new TypeError('Must be Buffer or image data')
    }
  }
}

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

  toImageData() {
    const metadata = this._image.metadata()
    const pixels = this._image.clone().raw().toBuffer()
    return Promise.all([metadata, pixels]).then(([metadata, pixels]) => {
      return {
        channels: 3,
        hasAlpha: false,
        width: metadata.width,
        height: metadata.height,
        data: pixels,
      }
    })
  }

  toBuffer() {
    let image = this._image
    image = this._setFormat(image)
    return image.toBuffer()
  }

  static from(bufferOrImageData, options) {
    return new NodeImage(SharpImage.from(bufferOrImageData), options)
  }
}

module.exports = NodeImage
