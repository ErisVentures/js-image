const sharp = require('sharp')
const Image = require('./image')
const ImageData = require('./image-data')

class SharpImage {
  static from(bufferOrImageData) {
    if (ImageData.probablyIs(bufferOrImageData)) {
      let imageData = ImageData.normalize(bufferOrImageData)
      ImageData.assert(imageData)
      imageData = ImageData.removeAlphaChannel(imageData)

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
    if (this._output.format.type === Image.JPEG) {
      return image.jpeg(this._output.format)
    } else if (this._output.format.type === Image.PNG) {
      return image.png()
    } else {
      throw new Error(`Unsupported format: ${this._output.format.type}`)
    }
  }

  toImageData() {
    const metadata = this._image.metadata()
    const pixels = this._image.clone().raw().toBuffer()
    return Promise.all([metadata, pixels]).then(([metadata, pixels]) => {
      return {
        channels: 3,
        format: ImageData.RGB,
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
