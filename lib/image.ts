import {writeFile} from 'fs'

import * as types from './types'
import {promisify} from './utils'

// tslint:disable-next-line
const writeFileAsync = promisify(writeFile)

export abstract class Image {
  // Image formats
  public static JPEG: types.ImageFormat = 'jpeg'
  public static PNG: types.ImageFormat = 'png'

  // Image resize methods
  public static AUTO_SIZE: types.ImageResizeMethod = 'auto'
  public static CONTAIN: types.ImageResizeMethod = 'contain'
  public static COVER: types.ImageResizeMethod = 'cover'
  public static EXACT: types.ImageResizeMethod = 'exact'
  public static CROP: types.ImageResizeMethod = 'crop'

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

    this._output.resize = Object.assign({method: Image.CROP}, options)
    return this
  }

  public greyscale(): Image {
    this._output.greyscale = true
    return this
  }

  public edges(options: types.EdgeMethod = Image.SOBEL): Image {
    this._output.edges = {method: options, kernelSize: 3}
    return this
  }

  public abstract toImageData(): Promise<types.ImageData>

  public abstract toBuffer(): Promise<Buffer>

  public toFile(path: string): Promise<{}> {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  public static from(bufferOrImageData: types.BufferLike|types.ImageData): Image {
    throw new Error('unimplemented')
  }
}
