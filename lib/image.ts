import * as types from './types'
import {ImageData} from './image-data'
import {writeFileAsync} from './fs-utils'

export abstract class Image {
  // Image formats
  public static JPEG: types.ImageFormat = 'jpeg'
  public static PNG: types.ImageFormat = 'png'

  // Image resize fits
  public static AUTO_SIZE: types.ImageResizeFit = 'auto'
  public static CONTAIN: types.ImageResizeFit = 'contain'
  public static COVER: types.ImageResizeFit = 'cover'
  public static EXACT: types.ImageResizeFit = 'exact'
  public static CROP: types.ImageResizeFit = 'crop'

  // Image resize methods
  public static NEAREST_NEIGHBOR: types.ImageResizeMethod = 'nearest-neighbor'
  public static BILINEAR: types.ImageResizeMethod = 'bilinear'

  // Edge detection methods
  public static SOBEL: types.EdgeMethod = 'sobel'
  public static CANNY: types.EdgeMethod = 'canny'

  protected _output: types.IImageOutputOptions

  public constructor() {
    this._output = {
      format: {type: 'jpeg'},
    }
  }

  public format(options: types.ImageFormat|types.IFormatOptions): Image {
    if (typeof options === 'string') {
      options = {type: options}
    }

    if (options.type !== Image.JPEG && options.type !== Image.PNG) {
      throw new Error(`Unrecognized format: ${options.type}`)
    }

    const defaultOpts = options.type === Image.JPEG ? {quality: 90} : {}
    this._output.format = Object.assign(defaultOpts, options)
    return this
  }

  public resize(options: types.IResizeOptions): Image {
    if (typeof options.width !== 'number' && typeof options.height !== 'number') {
      throw new TypeError('Must specify a width or height')
    }

    this._output.resize = Object.assign({
      fit: Image.CROP,
      method: Image.BILINEAR,
    }, options)
    return this
  }

  public greyscale(): Image {
    this._output.greyscale = true
    return this
  }

  public edges(options: types.EdgeMethod = Image.SOBEL): Image {
    this._output.edges = {method: options, radius: 1}
    return this
  }

  public abstract toImageData(): Promise<ImageData>

  public abstract toBuffer(): Promise<Buffer>

  public toFile(path: string): Promise<{}> {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  public static from(bufferOrImageData: types.BufferLike|ImageData): Image {
    throw new Error('unimplemented')
  }
}
