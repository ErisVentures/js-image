export interface IFormatOptions {
  type: ImageFormat,
  quality?: number,
}

export interface IResizeOptions {
  width?: number,
  height?: number,
  fit?: ImageResizeFit,
  method?: ImageResizeMethod,
}

export interface IEdgeOptions {
  method: EdgeMethod,
  radius?: number,
  blurSigma?: number,
  highThreshold?: number,
  lowThreshold?: number,
}

export interface IImageOutputOptions {
  format: IFormatOptions,
  resize?: IResizeOptions,
  greyscale?: boolean,
  edges?: IEdgeOptions,
}

export interface IAnalysisOptions {
  hash?: IHashOptions,
}

export interface ISobelOptions {
  radius?: number,
}

export interface ICannyOptions {
  radius?: number,
  highThreshold?: number,
  lowThreshold?: number,
}

export interface IBlurOptions {
  radius?: number,
  sigma?: number,
  approximate?: boolean,
}

export interface IHashOptions {
  method: HashMethod,
  hashSize?: number,
}

export interface ISharpnessOptions {
  threshold?: number,
}

export interface IMetadata {
  width: number,
  height: number,
  aspectRatio: number,
}

export interface ISharpness {
  percentEdges: number,
  lowerQuartile: number,
  median: number,
  upperQuartile: number,
  lowerVentileAverage: number,
  average: number,
  upperVentileAverage: number,
}

export interface IAnalysis {
  hash?: BufferLike
}

export type ImageFormat = 'jpeg' | 'png'
export type ImageResizeFit = 'auto' | 'contain' | 'cover' | 'exact' | 'crop'
export type ImageResizeMethod = 'nearestNeighbor' | 'bilinear' | 'bicubic'
export type EdgeMethod = 'sobel' | 'canny'
export type HashMethod = 'phash'

export type ImageDataFormat = 'rgb' | 'rgba' | 'b'
export type BufferLike = Buffer|Uint8Array|number[]

export interface Pixel {
  value?: number,
  index?: number,
  x: number,
  y: number,
}
