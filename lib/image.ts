import {promisify} from 'bluebird'
import {writeFile} from 'fs'

import {BufferLike, ImageData} from './image-data'

// tslint:disable-next-line
const writeFileAsync: any = promisify(writeFile)

export interface IFormatOptions {
  type: ImageFormat,
  quality?: number,
}

export interface IResizeOptions {
  width?: number,
  height?: number,
  method: ImageResizeMethod,
}

export interface IImageOutputOptions {
  format: IFormatOptions,
  resize?: IResizeOptions,
  greyscale?: boolean,
}

export type ImageFormat = 'jpeg' | 'png'
export type ImageResizeMethod = 'auto' | 'contain' | 'cover' | 'exact' | 'crop'

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

  public abstract toImageData(): Promise<ImageData>

  public abstract toBuffer(): Promise<Buffer>

  public toFile(path: string): Promise<{}> {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  public static from(bufferOrImageData: BufferLike|ImageData): Image {
    throw new Error('unimplemented')
  }
}
