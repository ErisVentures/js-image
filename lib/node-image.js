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

  static toImageData(image) {
    const metadata = image.metadata()
    const pixels = image.clone().raw().toBuffer()
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
}

class NodeImage extends Image {
  constructor(image, options) {
    super(options)
    this._image = image
  }

  _applyFormat(image) {
    if (this._output.format.type === Image.JPEG) {
      return image.jpeg(this._output.format)
    } else if (this._output.format.type === Image.PNG) {
      return image.png()
    } else {
      throw new Error(`Unsupported format: ${this._output.format.type}`)
    }
  }

  _applyResize(image) {
    if (!this._output.resize) {
      return image
    }

    const {width, height, method} = this._output.resize
    image = image.resize(width, height)
    switch (method) {
      case Image.CONTAIN:
        image = image.max()
        break
      case Image.COVER:
        image = image.min()
        break
      case Image.EXACT:
        image = image.ignoreAspectRatio()
        break
      case Image.CROP:
      default:
        image = image.crop(sharp.gravity.center)
    }

    return image
  }

  _applyAll(image) {
    return Promise.resolve(image)
      .then(image => this._applyFormat(image))
      .then(image => this._applyResize(image))
  }

  toImageData() {
    return this._applyAll(this._image).then(SharpImage.toImageData)
  }

  toBuffer() {
    return this._applyAll(this._image).then(image => image.toBuffer())
  }

  static from(bufferOrImageData, options) {
    return new NodeImage(SharpImage.from(bufferOrImageData), options)
  }
}

module.exports = NodeImage
