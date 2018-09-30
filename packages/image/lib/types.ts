export type MapPixelFn = (pixel: IPixel) => number[]

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
  /** Applies the curve to the lightness in the image, an array of number tuples mapping input to output, i.e. for a slight contrast curve [[0, 0], [50, 40], [200, 210], [255, 255]] */
  curve?: number[][]
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
  X = 'x-xyz',
  Y = 'y-xyz',
  Z = 'z-xyz',
}

export enum Colorspace {
  HSL = 'hsl',
  YCbCr = 'ycbcr',
  XYZ = 'xyz',
  XYY = 'xyy',
  RGB = 'rgb',
  RGBA = 'rgba',
  Greyscale = 'k',
}

export interface ICalibrationProfile {
  xRed: number
  yRed: number
  zRed: number
  xGreen: number
  yGreen: number
  zGreen: number
  xBlue: number
  yBlue: number
  zBlue: number
}

export type BufferLike = Buffer | Uint8Array | number[]

export interface IPixelCoordinate {
  x: number
  y: number
}

export interface IBasePixel extends IPixelCoordinate {
  index: number
  colorspace: Colorspace
  values: number[]
}

export interface IRGBPixel extends IBasePixel {
  colorspace: Colorspace.RGB
  values: [number, number, number]
}

export interface IGreyscalePixel extends IBasePixel {
  colorspace: Colorspace.Greyscale
  values: [number]
}

export interface IHSLPixel extends IBasePixel {
  colorspace: Colorspace.HSL
  values: [number, number, number]
}

export type IPixel = IRGBPixel | IGreyscalePixel | IHSLPixel | IBasePixel
