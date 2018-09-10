import * as sharp from 'sharp'

import {BufferLike, IMetadata, Colorspace} from './types'
import {Image} from './image'
import {IAnnotatedImageData, ImageData} from './image-data'
import {sobel} from './transforms/sobel'
import {canny} from './transforms/canny'
import {tone} from './transforms/tone'

class SharpImage {
  public static from(bufferOrImageData: BufferLike | IAnnotatedImageData): sharp.SharpInstance {
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
        width: metadata.width!,
        height: metadata.height!,
        aspectRatio: metadata.width! / metadata.height!,
      }
    })
  }

  public static async toImageData(image: sharp.SharpInstance): Promise<IAnnotatedImageData> {
    const rawData = await (image.clone().raw().toBuffer as any)({resolveWithObject: true})
    const {width, height, size} = rawData.info
    const channels = size / width / height

    return {
      channels,
      width,
      height,
      colorspace: channels === 3 ? Colorspace.RGB : Colorspace.Greyscale,
      data: rawData.data,
    }
  }
}

export class NodeImage extends Image {
  private readonly _image: sharp.SharpInstance
  private readonly _metadata: object | undefined

  public constructor(image: sharp.SharpInstance, metadata?: object) {
    super()
    this._image = image
    this._metadata = metadata
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

    const {width, height, fit, subselect} = this._output.resize
    if (subselect) {
      image = image.extract({
        top: subselect.top,
        left: subselect.left,
        width: subselect.right - subselect.left,
        height: subselect.bottom - subselect.top,
      })
    }

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

  private async _applyTone(image: sharp.SharpInstance): Promise<sharp.SharpInstance> {
    if (!this._output.tone) {
      return image
    }

    const imageData = await SharpImage.toImageData(image)
    const toned = tone(imageData, this._output.tone)
    return SharpImage.from(toned)
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

  private async _applyAll(imagePromise: sharp.SharpInstance): Promise<sharp.SharpInstance> {
    let image = await imagePromise
    image = await this._applyResize(image)
    image = await this._applyGreyscale(image)
    image = await this._applyTone(image)
    image = await this._applyEdges(image)
    image = await this._applyFormat(image)
    return image
  }

  public toMetadata(): Promise<IMetadata> {
    return SharpImage.toMetadata(this._image).then(metadata => {
      return {...this._metadata, ...metadata}
    })
  }

  public toImageData(): Promise<IAnnotatedImageData> {
    return this._applyAll(this._image).then(SharpImage.toImageData)
  }

  public toBuffer(): Promise<BufferLike> {
    return this._applyAll(this._image).then(image => image.toBuffer())
  }

  protected static _fromBuffer(buffer: BufferLike, metadata?: object): Image {
    return new NodeImage(SharpImage.from(buffer), metadata)
  }

  protected static _fromImageData(imageData: IAnnotatedImageData): Image {
    return new NodeImage(SharpImage.from(imageData))
  }
}
