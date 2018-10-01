import * as types from './types'
import {IAnnotatedImageData, ImageData} from './image-data'
import {writeFileAsync} from './fs-utils'
import {sobel} from './transforms/sobel'
import {phash} from './analyses/hash'
import {sharpness as computeSharpness} from './analyses/sharpness'
import {parse as parseEXIF, TIFFDecoder} from '@eris/exif'
import {tone} from './transforms/tone'
import {gaussianBlur} from './transforms/blur'
import {canny} from './transforms/canny'
import {sharpen} from './transforms/sharpen'
import {calibrate} from './transforms/calibrate'

/* tslint:disable-next-line */
const fileType = require('file-type')

export abstract class Image {
  protected _output: types.IImageOutputOptions
  protected _analyze?: types.IAnalysisOptions

  public constructor() {
    this._output = {
      format: {type: types.ImageFormat.JPEG, quality: 90},
    }
  }

  public format(options: types.ImageFormat | types.IFormatOptions): Image {
    if (typeof options === 'string') {
      options = {type: options}
    }

    if (options.type !== types.ImageFormat.JPEG && options.type !== types.ImageFormat.PNG) {
      throw new Error(`Unrecognized format: ${options.type}`)
    }

    const defaultOpts = options.type === types.ImageFormat.JPEG ? {quality: 90} : {}
    this._output.format = {...defaultOpts, ...options}
    return this
  }

  public resize(options: types.IResizeOptions): Image {
    const {Exact, Auto} = types.ImageResizeFit
    if (!options.width && !options.height && !options.subselect) {
      throw new TypeError('Must specify a width, height, or subselect')
    }

    const canCalculateDimensions = options.fit && (options.fit === Exact || options.fit === Auto)
    if ((!options.width || !options.height) && !canCalculateDimensions) {
      throw new TypeError(`Must specify width and height with "${options.fit}" fit`)
    }

    this._output.resize = {
      fit: Exact,
      method: types.ImageResizeMethod.Bilinear,
      ...options,
    }
    return this
  }

  public calibrate(options: types.ICalibrationOptions): Image {
    this._output.calibrate = options
    return this
  }

  public tone(options: types.IToneOptions): Image {
    this._output.tone = options
    return this
  }

  public greyscale(): Image {
    this._output.greyscale = true
    return this
  }

  public sharpen(options: types.ISharpenOptions = {}): Image {
    this._output.sharpen = options
    return this
  }

  public edges(method: types.EdgeMethod | types.IEdgeOptions = types.EdgeMethod.Sobel): Image {
    let options = method as types.IEdgeOptions
    if (typeof method === 'string') {
      options = {method}
    }

    this._output.edges = {
      radius: 1,
      blurSigma: 2,
      ...options,
    }
    return this
  }

  public analyze(options: types.IAnalysisOptions): Image {
    this._analyze = options
    return this
  }

  public toAnalysis(): Promise<types.IAnalysis> {
    if (!this._analyze) {
      return Promise.resolve({})
    }

    const {hash, sharpness} = this._analyze
    return this.toImageData().then(imageData => {
      const analysis: types.IAnalysis = {}
      if (hash) {
        switch (hash.method) {
          case types.HashMethod.PHash:
          default:
            analysis.hash = phash(imageData, hash.hashSize)
        }
      }

      if (sharpness) {
        const edges = sobel(imageData, sharpness)
        analysis.sharpness = computeSharpness(edges, sharpness)
      }

      return analysis
    })
  }

  protected _applyCalibrate(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.calibrate) {
      return image
    }

    return calibrate(image, this._output.calibrate)
  }

  protected _applyTone(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.tone) {
      return image
    }

    return tone(image, this._output.tone)
  }

  protected _applySharpen(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.sharpen) {
      return image
    }

    return sharpen(image, this._output.sharpen)
  }

  protected _applyEdges(image: IAnnotatedImageData): IAnnotatedImageData {
    if (!this._output.edges) {
      return image
    }

    const edgeOptions = this._output.edges
    image = ImageData.toRGBA(image)

    let edges = image
    if (edgeOptions.blurSigma) {
      edges = gaussianBlur(image, {sigma: edgeOptions.blurSigma})
    }

    edges = sobel(edges, edgeOptions)
    if (edgeOptions.method === types.EdgeMethod.Canny) {
      edges = canny(edges, edgeOptions)
    }

    return edges
  }

  public abstract toMetadata(): Promise<types.IMetadata>

  public abstract toImageData(): Promise<IAnnotatedImageData>

  public abstract toBuffer(): Promise<types.BufferLike>

  public toFile(path: string): Promise<{}> {
    return this.toBuffer().then(buffer => writeFileAsync(path, buffer))
  }

  public static from(bufferOrImageData: types.BufferLike | IAnnotatedImageData): Image {
    if (ImageData.probablyIs(bufferOrImageData)) {
      return this._fromImageData(bufferOrImageData as IAnnotatedImageData)
    }

    let buffer = bufferOrImageData as Buffer
    let exif = undefined // tslint:disable-line

    const type = fileType(buffer) || {mime: 'unknown'}
    switch (type.mime) {
      case 'image/tiff':
        const decoder = new TIFFDecoder(buffer)
        buffer = decoder.extractJPEG() as Buffer
        exif = parseEXIF(decoder)
        break
      default:
        exif = parseEXIF(buffer)
    }
    return this._fromBuffer(buffer, {exif})
  }

  protected static _fromBuffer(buffer: types.BufferLike, metadata?: object): Image {
    throw new Error('unimplemented')
  }

  protected static _fromImageData(imageData: IAnnotatedImageData): Image {
    throw new Error('unimplemented')
  }
}
