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

export interface IImageOutputOptions {
  format: IFormatOptions
  resize?: IResizeOptions
  greyscale?: boolean
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

export type ImageDataFormat = 'hsl' | 'rgb' | 'rgba' | 'k'
export type BufferLike = Buffer | Uint8Array | number[]

export interface Pixel {
  value?: number
  index?: number
  x: number
  y: number
}
