import * as sharp from 'sharp'

import {BufferLike, IMetadata} from './types'
import {Image} from './image'
import {ImageData} from './image-data'
import {sobel} from './transforms/sobel'
import {canny} from './transforms/canny'

class SharpImage {
  public static from(bufferOrImageData: BufferLike|ImageData): sharp.SharpInstance {
    if (ImageData.probablyIs(bufferOrImageData)) {
      let imageData = ImageData.normalize(bufferOrImageData)
      ImageData.assert(imageData)
      imageData = ImageData.toRGB(imageData)

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

  public static toMetadata(image: sharp.SharpInstance): Promise<IMetadata> {
    return image.metadata().then(metadata => {
      return {
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.width! / metadata.height!,
      }
    })
  }

  public static toImageData(image: sharp.SharpInstance): Promise<ImageData> {
    const metadata = image.metadata()
    const pixels = image.clone().raw().toBuffer()
    return Promise.all([metadata, pixels]).then(([metadata, pixels]) => ({
      channels: 3,
      format: ImageData.RGB,
      width: metadata.width!,
      height: metadata.height!,
      data: pixels,
    }))
  }
}

export class NodeImage extends Image {
  private _image: sharp.SharpInstance

  public constructor(image: sharp.SharpInstance) {
    super()
    this._image = image
  }

  private _applyFormat(image: sharp.SharpInstance): sharp.SharpInstance {
    if (this._output.format.type === Image.JPEG) {
      return image.jpeg(this._output.format)
    } else if (this._output.format.type === Image.PNG) {
      return image.png()
    } else {
      throw new Error(`Unsupported format: ${this._output.format.type}`)
    }
  }

  private _applyResize(image: sharp.SharpInstance): sharp.SharpInstance {
    if (!this._output.resize) {
      return image
    }

    const {width, height, fit} = this._output.resize
    image = image.resize(width, height)
    switch (fit) {
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

  private _applyGreyscale(image: sharp.SharpInstance): sharp.SharpInstance {
    if (!this._output.greyscale || this._output.edges) {
      return image
    }

    return image.greyscale()
  }

  private _applyEdges(image: sharp.SharpInstance): Promise<sharp.SharpInstance> {
    if (!this._output.edges) {
      return Promise.resolve(image)
    }

    const edgeOptions = this._output.edges
    let blurredIfNecessary = image
    if (edgeOptions.blurSigma) {
      blurredIfNecessary = image.clone().blur(edgeOptions.blurSigma)
    }

    return SharpImage.toImageData(blurredIfNecessary).then(imageData => {
      let edges = sobel(imageData, edgeOptions)
      if (edgeOptions.method === Image.CANNY) {
        edges = canny(edges, edgeOptions)
      }
      return SharpImage.from(edges)
    })
  }

  private _applyAll(image: sharp.SharpInstance): Promise<sharp.SharpInstance> {
    return Promise.resolve(image)
      .then(image => this._applyResize(image))
      .then(image => this._applyEdges(image))
      .then(image => this._applyGreyscale(image))
      .then(image => this._applyFormat(image))
  }

  public toMetadata(): Promise<IMetadata> {
    return SharpImage.toMetadata(this._image)
  }

  public toImageData(): Promise<ImageData> {
    return this._applyAll(this._image).then(SharpImage.toImageData)
  }

  public toBuffer(): Promise<BufferLike> {
    return this._applyAll(this._image).then(image => image.toBuffer())
  }

  protected static _fromBuffer(buffer: BufferLike): Image {
    return new NodeImage(SharpImage.from(buffer))
  }

  protected static _fromImageData(imageData: ImageData): Image {
    return new NodeImage(SharpImage.from(imageData))
  }
}
