import {BufferLike, IMetadata} from './types'
import {Image} from './image'
import {ImageData} from './image-data'
import {gaussianBlur} from './transforms/blur'
import {nearestNeighbor, bilinear} from './transforms/resize'
import {sobel} from './transforms/sobel'
import {canny} from './transforms/canny'

export class BrowserImage extends Image {
  private _image: Promise<ImageData>

  public constructor(image: Promise<ImageData>|ImageData) {
    super()
    this._image = Promise.resolve(image)
  }

  private _applyResize(image: ImageData): ImageData {
    if (!this._output.resize) {
      return image
    }

    const {method} = this._output.resize
    switch (method) {
      case Image.NEAREST_NEIGHBOR:
        return nearestNeighbor(image, this._output.resize)
      case Image.BILINEAR:
      default:
        return bilinear(image, this._output.resize)
    }

  }

  private _applyGreyscale(image: ImageData): ImageData {
    if (!this._output.greyscale) {
      return image
    }

    return ImageData.toGreyscale(image)
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

  private _applyAll(image: Promise<ImageData>): Promise<ImageData> {
    return Promise.resolve(image)
      .then(image => this._applyGreyscale(image))
      .then(image => this._applyResize(image))
      .then(image => this._applyEdges(image))
  }

  public toMetadata(): Promise<IMetadata> {
    return this._image.then(imageData => {
      return {
        width: imageData.width,
        height: imageData.height,
        aspectRatio: imageData.width / imageData.height,
      }
    })
  }

  public toImageData(): Promise<ImageData> {
    return this._applyAll(this._image)
  }

  public toBuffer(): Promise<Buffer> {
    return this._applyAll(this._image)
        .then(imageData => ImageData.toBuffer(imageData, this._output.format))
  }

  public static from(bufferOrImageData: BufferLike|ImageData): Image {
    if (ImageData.probablyIs(bufferOrImageData)) {
      return new BrowserImage(ImageData.normalize(bufferOrImageData))
    }
    const buffer = bufferOrImageData as BufferLike
    return new BrowserImage(ImageData.from(buffer))
  }
}
