import {BufferLike} from './types'
import {Image} from './image'
import {ImageData} from './image-data'
import {gaussianBlur} from './transforms/blur'
import {nearestNeighbor} from './transforms/resize'
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

    return nearestNeighbor(image, this._output.resize)
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

    let edges = sobel(gaussianBlur(image, {sigma: 2}))
    if (this._output.edges!.method === Image.CANNY) {
      edges = canny(edges, undefined)
    }

    return edges
  }

  private _applyAll(image: Promise<ImageData>): Promise<ImageData> {
    return Promise.resolve(image)
      .then(image => this._applyGreyscale(image))
      .then(image => this._applyResize(image))
      .then(image => this._applyEdges(image))
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
