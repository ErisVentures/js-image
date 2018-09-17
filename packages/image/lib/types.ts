export type MapPixelFn = (pixel: Pixel) => number

export interface IFormatOptions {
  type: ImageFormat
  quality?: number
}

export interface IResizeOptions {
  width?: number
  height?: number
  fit?: ImageResizeFit
  method?: ImageResizeMethod
  subselect?: ISubselectOptions
}

export interface IEdgeOptions {
  method: EdgeMethod
  radius?: number
  blurSigma?: number
  highThreshold?: number
  lowThreshold?: number
}

export interface IToneOptions {
  /** Affects the overall contrast in the image, typically a number between -0.5 and 2, reasonable range of -0.1 to 0.3 */
  contrast?: number
  whites?: number
  highlights?: number
  midtones?: number
  shadows?: number
  blacks?: number
}

export interface IImageOutputOptions {
  format: IFormatOptions
  resize?: IResizeOptions
  tone?: IToneOptions
  greyscale?: boolean
  sharpen?: ISharpenOptions
  edges?: IEdgeOptions
}

export interface IAnalysisOptions {
  hash?: IHashOptions
  sharpness?: ISharpnessOptions
}

export interface ISobelOptions {
  radius?: number
}

export interface ICannyOptions {
  radius?: number
  highThreshold?: number
  lowThreshold?: number
}

export interface IBlurOptions {
  radius?: number
  sigma?: number
  approximate?: boolean
}

export interface ISharpenOptions {
  strength?: number
}

export interface IHashOptions {
  method: HashMethod
  hashSize?: number
}

export interface ISharpnessOptions {
  radius?: number
  threshold?: number
}

export interface IMetadata {
  width: number
  height: number
  aspectRatio: number
  exif?: object
}

export interface ISharpness {
  percentEdges: number
  lowerQuartile: number
  median: number
  upperQuartile: number
  lowerVentileAverage: number
  average: number
  upperVentileAverage: number
}

export interface IAnalysis {
  hash?: string
  sharpness?: ISharpness
}

export interface ISubselectOptions {
  top: number
  bottom: number
  left: number
  right: number
}

export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
}

export enum ImageResizeFit {
  Auto = 'auto',
  Contain = 'contain',
  Cover = 'cover',
  Exact = 'exact',
  Crop = 'crop',
}

export enum ImageResizeMethod {
  NearestNeighbor = 'nearestNeighbor',
  Bilinear = 'bilinear',
  Bicubic = 'bicubic',
}

export enum EdgeMethod {
  Sobel = 'sobel',
  Canny = 'canny',
}

export enum HashMethod {
  PHash = 'phash',
}

export enum ColorChannel {
  Red = 'r',
  Green = 'g',
  Blue = 'b',
  Alpha = 'a',
  Hue = 'h',
  Saturation = 's',
  Lightness = 'l',
  Luma = 'y',
  ChromaBlue = 'cb',
  ChromaRed = 'cr',
}

export enum Colorspace {
  HSL = 'hsl',
  YCbCr = 'ycbcr',
  RGB = 'rgb',
  RGBA = 'rgba',
  Greyscale = 'k',
}

export type BufferLike = Buffer | Uint8Array | number[]

export interface Pixel {
  value?: number
  index?: number
  channel?: ColorChannel
  x: number
  y: number
}
