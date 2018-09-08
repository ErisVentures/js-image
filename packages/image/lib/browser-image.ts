import {BufferLike, IMetadata} from './types'
import {Image} from './image'
import {ImageData} from './image-data'
import {gaussianBlur} from './transforms/blur'
import * as resize from './transforms/resize'
import {subselect} from './transforms/subselect'
import {sobel} from './transforms/sobel'
import {canny} from './transforms/canny'
import {tone} from './transforms/tone'

export class BrowserImage extends Image {
  private readonly _image: Promise<ImageData>
  private readonly _metadata: object | undefined

  public constructor(image: Promise<ImageData> | ImageData, metadata?: object) {
    super()
    this._image = Promise.resolve(image)
    this._metadata = metadata
  }

  private _applyResize(image: ImageData): ImageData {
    if (!this._output.resize) {
      return image
    }

    const options = resize.normalizeOptions(image, this._output.resize)

    if (options.subselect) {
      image = subselect(image, options.subselect)
    }

    switch (options.method) {
      case Image.NEAREST_NEIGHBOR:
        return resize.nearestNeighbor(image, options)
      case Image.BILINEAR:
      default:
        return resize.bilinear(image, options)
    }
  }

  private _applyGreyscale(image: ImageData): ImageData {
    if (!this._output.greyscale) {
      return image
    }

    return ImageData.toGreyscale(image)
  }

  private _applyTone(image: ImageData): ImageData {
    if (!this._output.tone) {
      return image
    }

    return tone(image, this._output.tone)
  }

  private _applyEdges(image: ImageData): ImageData {
    if (!this._output.edges) {
      return image
    }

    const edgeOptions = this._output.edges

    let edges = image
    if (edgeOptions.blurSigma) {
      edges = gaussianBlur(image, {sigma: edgeOptions.blurSigma})
    }

    edges = sobel(edges, edgeOptions)
    if (edgeOptions.method === Image.CANNY) {
      edges = canny(edges, edgeOptions)
    }

    return edges
  }

  private async _applyAll(imagePromise: Promise<ImageData>): Promise<ImageData> {
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

  public toImageData(): Promise<ImageData> {
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

  protected static _fromImageData(imageData: ImageData): Image {
    return new BrowserImage(ImageData.normalize(imageData))
  }
}
