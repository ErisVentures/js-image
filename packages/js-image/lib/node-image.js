const sharp = require('sharp')
const Image = require('./image')

class NodeImage extends Image {
  constructor(image, options) {
    super(options)
    this._image = image
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
      image = bufferOrImageData
    } else {
      throw new TypeError('Must be Buffer of image data')
    }

    return new NodeImage(image, options)
  }
}

module.exports = NodeImage
