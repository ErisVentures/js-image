import {BufferLike, IMetadata, ImageResizeMethod, DEFAULT_FORMAT} from './types'
import {Image} from './image'
import {IAnnotatedImageData, ImageData} from './image-data'
import * as resize from './transforms/resize'
import {subselect} from './transforms/subselect'
import {instrumentation} from './instrumentation'

export class BrowserImage extends Image {
  private readonly _image: Promise<IAnnotatedImageData>
  private readonly _metadata: Partial<IMetadata> | undefined

  public constructor(
    image: Promise<IAnnotatedImageData> | IAnnotatedImageData,
    metadata?: Partial<IMetadata>,
  ) {
    super()
    this._image = Promise.resolve(image)
    this._metadata = metadata
  }

  private _applyEXIFOrientation(image: IAnnotatedImageData): IAnnotatedImageData {
    const exif = this._metadata && this._metadata.exif
    if (!exif || !exif._raw.Orientation) {
      return image
    }

    /** @see https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html */
    switch (exif._raw.Orientation) {
      case 1:
        // Do nothing
        break
      case 3:
        image = ImageData.rotate(image, 180)
        break
      case 6:
        image = ImageData.rotate(image, 270) // our rotate is CCW so 360 - 90
        break
      case 8:
        image = ImageData.rotate(image, 90) // our rotate is CCW so 360 - 270
        break
      default:
        throw new Error(`Unable to handle orientation ${exif._raw.Orientation}`)
    }

    return image
  }

  private _applyResize(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.resize) {
      return image
    }

    const options = resize.normalizeOptions(image, this._output.resize)

    if (options.doNotEnlarge) {
      const {width: realWidth = 0, height: realHeight = 0} = image
      if (realWidth < options.width) return image
      if (realHeight < options.height) return image
    }

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
    image = await this._applyEXIFOrientation(image)
    image = await this._applyGreyscale(image)
    image = await this._applyResize(image)
    image = await this._applyLayers(image)
    image = await this._applyNormalize(image)
    image = await this._applyCalibrate(image)
    image = await this._applyTone(image)
    image = await this._applySharpen(image)
    image = await this._applyEdges(image)
    image = await this._applyEffects(image)
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
      ImageData.toBuffer(imageData, this._output.format || DEFAULT_FORMAT),
    )
  }

  protected static _fromBuffer(buffer: BufferLike, metadata?: Partial<IMetadata>): Image {
    return new BrowserImage(ImageData.from(buffer), metadata)
  }

  protected static _fromImageData(imageData: IAnnotatedImageData): Image {
    return new BrowserImage(ImageData.normalize(imageData))
  }
}

instrumentation.wrapAllMethods(BrowserImage.prototype)
