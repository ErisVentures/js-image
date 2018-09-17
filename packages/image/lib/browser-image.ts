import {BufferLike, IMetadata, ImageResizeMethod} from './types'
import {Image} from './image'
import {IAnnotatedImageData, ImageData} from './image-data'
import * as resize from './transforms/resize'
import {subselect} from './transforms/subselect'

export class BrowserImage extends Image {
  private readonly _image: Promise<IAnnotatedImageData>
  private readonly _metadata: object | undefined

  public constructor(image: Promise<IAnnotatedImageData> | IAnnotatedImageData, metadata?: object) {
    super()
    this._image = Promise.resolve(image)
    this._metadata = metadata
  }

  private _applyResize(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.resize) {
      return image
    }

    const options = resize.normalizeOptions(image, this._output.resize)

    if (options.subselect) {
      image = subselect(image, options.subselect)
    }

    switch (options.method) {
      case ImageResizeMethod.NearestNeighbor:
        return resize.nearestNeighbor(image, options)
      case ImageResizeMethod.Bilinear:
      default:
        return resize.bilinear(image, options)
    }
  }

  private _applyGreyscale(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.greyscale) {
      return image
    }

    return ImageData.toGreyscale(image)
  }

  private async _applyAll(
    imagePromise: Promise<IAnnotatedImageData>,
  ): Promise<IAnnotatedImageData> {
    let image = await imagePromise
    image = await this._applyGreyscale(image)
    image = await this._applyResize(image)
    image = await this._applyTone(image)
    image = await this._applyEdges(image)
    return image
  }

  public toMetadata(): Promise<IMetadata> {
    return this._image.then(imageData => {
      return {
        ...this._metadata,
        width: imageData.width,
        height: imageData.height,
        aspectRatio: imageData.width / imageData.height,
      }
    })
  }

  public toImageData(): Promise<IAnnotatedImageData> {
    return this._applyAll(this._image)
  }

  public toBuffer(): Promise<BufferLike> {
    return this._applyAll(this._image).then(imageData =>
      ImageData.toBuffer(imageData, this._output.format),
    )
  }

  protected static _fromBuffer(buffer: BufferLike, metadata?: object): Image {
    return new BrowserImage(ImageData.from(buffer), metadata)
  }

  protected static _fromImageData(imageData: IAnnotatedImageData): Image {
    return new BrowserImage(ImageData.normalize(imageData))
  }
}
