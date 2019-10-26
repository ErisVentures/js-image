import {INormalizedMetadata} from '@eris/exif'
import {IAnnotatedImageData} from './image-data'

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
  doNotEnlarge?: boolean
}

export interface IEdgeOptions {
  method: EdgeMethod
  radius?: number
  blurSigma?: number
  highThreshold?: number
  lowThreshold?: number
}

export interface INoiseOptions {
  /** Used for the random noise pattern to generate predictable noise */
  seed?: string
  /** The strength of the noise, typically a value between 0 and 0.1 */
  opacity?: number
}

export enum EffectType {
  Noise = 'noise',
}

// tslint:disable-next-line
export type IEffect = {type: EffectType.Noise; options?: INoiseOptions}

export interface IHSLAdjustment {
  /** A hue degree number, 0-360 */
  targetHue: number
  /** The maximum distance from the targetHue that should be affected, defaults to 30 */
  targetBreadth?: number
  hueShift?: number
  saturationShift?: number
  lightnessShift?: number
}

export interface IToneOptions {
  /** Affects the overall contrast in the image, typically a number between -0.5 and 2, reasonable range of -0.1 to 0.3 */
  contrast?: number
  /** Applies the curve to the lightness in the image, an array of number tuples mapping input to output, i.e. for a slight contrast curve [[0, 0], [50, 40], [200, 210], [255, 255]] */
  curve?: number[][]
  redCurve?: number[][]
  blueCurve?: number[][]
  greenCurve?: number[][]
  /** Affects the overall saturation in the image, typically a number between -1 and 2 */
  saturation?: number
  /** Applies the HSL adjustments in the image. */
  hsl?: IHSLAdjustment[]
  whites?: number
  highlights?: number
  midtones?: number
  shadows?: number
  blacks?: number
}

export interface ICalibrationOptions {
  redHueShift?: number
  redSaturationShift?: number
  greenHueShift?: number
  greenSaturationShift?: number
  blueHueShift?: number
  blueSaturationShift?: number
}

export interface ILayerOptions {
  imageData: IAnnotatedImageData
  opacity: number
}

export interface IImageOutputOptions {
  format?: IFormatOptions
  resize?: IResizeOptions
  layers?: ILayerOptions[]
  calibrate?: ICalibrationOptions
  tone?: IToneOptions
  greyscale?: boolean
  sharpen?: ISharpenOptions
  edges?: IEdgeOptions
  effects?: IEffect[]
}

export interface IAnalysisOptions {
  hash?: IHashOptions
  faces?: IFaceAnalysisOptions
  sharpness?: ISharpnessOptions
  histograms?: IHistogramOptions
  composition?: ICompositionOptions
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
  /** The size of the hash in bits, must be a square multiple of 64. i.e. 64, 256, 1024 */
  hashSize?: number
}

export interface ISharpnessOptions {
  /** The radius to use for the sobel filter, typically 1-5. */
  radius?: number
  /** The minimum edge intensity to consider an edge to be counted in the stats, typically 10-30. */
  threshold?: number
  subselect?: IBoundingBox
}

export interface IFaceAnalysisOptions {
  /** The minimum confidence to include faces for analysis, typically a number 0.5-1.0. */
  threshold?: number
}

export interface IHistogramOptions {
  /** The number of histogram buckets to compute */
  buckets?: number
}

export interface IWindowsOptions {
  /** The window size as a percentage of the smaller dimension. e.g. 0.125 for 12.5% */
  windowSize?: number
}

export interface ICompositionOptions {
  /** The minimum edge pixel intensity rule to be considered, typically a number 32-96 */
  ruleOfThirdsEdgeThreshold?: number
  /** The percentage of the max distance from a rule of thirds point before the score starts decreasing, typically a number 0.4-0.6 */
  ruleOfThirdsFalloffPoint?: number
  /** The minimum edge pixel intensity rule to be considered, typically a number 32-96 */
  parallelismEdgeThreshold?: number
  /** The minimum size of a line to be considered a "streak" as a percentage of the width/height, typically a number .01-.10.  */
  parallelismStreakThreshold?: number
  /** The precomputed sharpness data used for sensible defaults, will be computed internally if omitted. */
  sharpnessAnalysis?: ISharpnessAnalysis
}

export interface IMetadata {
  width: number
  height: number
  aspectRatio: number
  exif?: INormalizedMetadata
}

export interface IFaceAnalysisEyeEntry extends IBoundingBox {
  openConfidence?: number
}

export interface IFaceAnalysisEntry {
  confidence: number
  expression: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'disgusted' | 'fearful'
  expressionConfidence: number
  happinessConfidence: number
  boundingBox: IBoundingBox
  descriptor: number[]
  eyes: IFaceAnalysisEyeEntry[]
  sharpness?: ISharpnessAnalysis
}

export interface ISharpnessAnalysis {
  percentEdges: number
  lowerQuartile: number
  median: number
  upperQuartile: number
  lowerVentileAverage: number
  average: number
  upperVentileAverage: number
}

export interface IHistogramsAnalysis {
  hue: number[]
  saturation: number[]
  lightness: number[]
}

export interface ICompositionAnalysis {
  ruleOfThirds: number
  horizontalParallelism: number
  verticalParallelism: number
}

export interface ISceneAnalysisEntry {
  scene: string
  confidence: number
}

export interface IObjectAnalysisEntry {
  object: string
  confidence: number
  boundingBox: IBoundingBox
}

export interface IAnalysis {
  hash?: string
  faces?: IFaceAnalysisEntry[]
  scenes?: ISceneAnalysisEntry[]
  sharpness?: ISharpnessAnalysis
  histograms?: IHistogramsAnalysis
  composition?: ICompositionAnalysis
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
  NoTranscode = 'no-transcode',
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
  Luminance255 = 'Y-255',
  Luminance = 'Y',
  Chroma = 'c',
  ChromaBlue = 'cb',
  ChromaRed = 'cr',
  x = 'x-xyy',
  y = 'y-xyy',
  X = 'x-xyz',
  Y = 'y-xyz',
  Z = 'z-xyz',
}

export enum Colorspace {
  HSL = 'hsl',
  HCL = 'hcl',
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

export type BufferLike = Buffer | Uint8Array | Float32Array | number[]

export interface IPixelCoordinate {
  x: number
  y: number
}

export interface IBoundingBox {
  x: number
  y: number
  width: number
  height: number
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

export interface IAllImageOptions extends IImageOutputOptions {
  analyze?: IAnalysisOptions
}

export const DEFAULT_FORMAT: IFormatOptions = {
  type: ImageFormat.JPEG,
  quality: 90,
}
