import {writeFile} from 'fs'

import {BufferLike, ImageData} from './image-data'
import {promisify} from './utils'

// tslint:disable-next-line
const writeFileAsync = promisify(writeFile)

export interface IFormatOptions {
  type: ImageFormat,
  quality?: number,
}

export interface IResizeOptions {
  width?: number,
  height?: number,
  method: ImageResizeMethod,
}

export interface IEdgeOptions {
  method: EdgeMethod,
  kernelSize?: number,
}

export interface IImageOutputOptions {
  format: IFormatOptions,
  resize?: IResizeOptions,
  greyscale?: boolean,
  edges?: IEdgeOptions,
}

export type ImageFormat = 'jpeg' | 'png'
export type ImageResizeMethod = 'auto' | 'contain' | 'cover' | 'exact' | 'crop'
export type EdgeMethod = 'sobel' | 'canny'

export abstract class Image {
  // Image formats
  public static JPEG: ImageFormat = 'jpeg'
  public static PNG: ImageFormat = 'png'

  // Image resize methods
  public static AUTO_SIZE: ImageResizeMethod = 'auto'
  public static CONTAIN: ImageResizeMethod = 'contain'
  public static COVER: ImageResizeMethod = 'cover'
  public static EXACT: ImageResizeMethod = 'exact'
  public static CROP: ImageResizeMethod = 'crop'

  public static SOBEL: EdgeMethod = 'sobel'
  public static CANNY: EdgeMethod = 'canny'

  protected _output: IImageOutputOptions

  public constructor() {
    this._output = {
      format: {type: 'jpeg'},
    }
  }

  public format(options: ImageFormat|IFormatOptions): Image {
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

  public resize(options: IResizeOptions): Image {
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

  public edges(options: EdgeMethod = Image.SOBEL): Image {
    this._output.edges = {method: options, kernelSize: 3}
    return this
  }

  public abstract toImageData(): Promise<ImageData>

  public abstract toBuffer(): Promise<Buffer>

  public toFile(path: string): Promise<{}> {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  public static from(bufferOrImageData: BufferLike|ImageData): Image {
    throw new Error('unimplemented')
  }
}
