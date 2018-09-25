/* tslint:disable */
import {IAnnotatedImageData, ImageData} from '../image-data'
import {MapPixelFn, IToneOptions, ColorChannel, Colorspace} from '../types'

function validateCurvesInput(options: IToneOptions): number[][] {
  let {curve} = options
  if (!curve) throw new Error('curve is not defined')

  let lastEntry = -Infinity
  for (const entry of curve) {
    if (entry.length !== 2) throw new Error(`curve entry ${JSON.stringify(entry)} is not a tuple`)
    if (entry[0] <= lastEntry) throw new Error('curve entry is not ascending')
    if (entry[0] < 0 || entry[0] > 255) throw new Error(`invalid curve entry input ${entry[0]}`)
    if (entry[1] < 0 || entry[1] > 255) throw new Error(`invalid curve entry input ${entry[0]}`)
  }

  if (!curve.length || curve[0][0] !== 0) curve = [[0, 0], ...curve]
  if (curve[curve.length - 1][0] !== 255) curve = [...curve, [255, 255]]
  return curve
}

export function mapPixels(
  imageData: IAnnotatedImageData,
  fns: MapPixelFn | MapPixelFn[],
): IAnnotatedImageData {
  if (!Array.isArray(fns)) fns = [fns]
  if (fns.length === 0) return imageData

  ImageData.assert(imageData, [
    Colorspace.RGBA,
    Colorspace.RGB,
    Colorspace.Greyscale,
    Colorspace.YCbCr,
  ])

  const {width, height, channels} = imageData
  var data = new Uint8Array(width * height * imageData.channels)
  var output = Object.assign({}, imageData, {width, height, data})

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var baseIndex = ImageData.indexFor(imageData, x, y)
      // TODO: improve performance here to only loop on desired channels
      for (var c = 0; c < channels; c++) {
        var channel = ImageData.channelFor(imageData, c)
        var value: number = imageData.data[baseIndex + c]
        for (const fn of fns) {
          value = fn({x, y, value, channel})
        }

        data[baseIndex + c] = ImageData.clip(value)
      }
    }
  }

  return output
}

export function contrast(options: IToneOptions): MapPixelFn {
  return pixel => {
    if (pixel.channel !== ColorChannel.Luma) return pixel.value!

    const delta = pixel.value! - 128
    return delta * options.contrast! + pixel.value!
  }
}

/**
 * Use monotonic cubic interpolation to map lightness values according to the provided curve.
 * @see https://en.wikipedia.org/wiki/Monotone_cubic_interpolation#Example_implementation
 * @param options
 */
export function curves(options: IToneOptions): MapPixelFn {
  const curve = validateCurvesInput(options)

  const xDiffs: number[] = []
  const yDiffs: number[] = []
  const slopes: number[] = []
  for (let i = 0; i < curve.length - 1; i++) {
    const [x0, y0] = curve[i]
    const [x1, y1] = curve[i + 1]
    const dx = x1 - x0
    const dy = y1 - y0

    xDiffs.push(dx)
    yDiffs.push(dy)
    slopes.push(dy / dx)
  }

  const firstDegreeCoefficients: number[] = []

  // Beyond the known points, the interpolation is a continued straight line
  firstDegreeCoefficients.push(slopes[0])
  // Between the known points, we use a fancy equation combining the slopes and dx of the current and next intervals
  for (let i = 0; i < slopes.length - 1; i++) {
    const slope0 = slopes[i]
    const slope1 = slopes[i + 1]
    if (slope0 * slope1 <= 0) {
      // If slope changes direction, use 0
      firstDegreeCoefficients.push(0)
    } else {
      const dx0 = xDiffs[i]
      const dx1 = xDiffs[i + 1]
      const dxTotal = dx0 + dx1
      firstDegreeCoefficients.push(
        (3 * dxTotal) / ((dxTotal + dx1) / slope0 + (dxTotal + dx0) / slope1),
      )
    }
  }
  // Continue the straight line beyond the known points
  firstDegreeCoefficients.push(slopes[slopes.length - 1])

  const secondDegreeCoefficients: number[] = []
  const thirdDegreeCoefficients: number[] = []
  // Use our math magic to fill in the 2nd and 3rd degree coefficients, only need n - 1 of them since beyond the points its straight line
  for (let i = 0; i < firstDegreeCoefficients.length - 1; i++) {
    const firstDegreeCoefficient0 = firstDegreeCoefficients[i]
    const firstDegreeCoefficient1 = firstDegreeCoefficients[i + 1]
    const slope = slopes[i]
    const dxInverse = 1 / xDiffs[i]
    const magicNumber = firstDegreeCoefficient0 + firstDegreeCoefficient1 - 2 * slope
    secondDegreeCoefficients.push((slope - firstDegreeCoefficient0 - magicNumber) * dxInverse)
    thirdDegreeCoefficients.push(magicNumber * dxInverse * dxInverse)
  }

  return pixel => {
    if (pixel.channel !== ColorChannel.Luma) return pixel.value!

    const input = pixel.value!
    const distances = curve.map(entry => (entry[0] > input ? Infinity : input - entry[0]))
    const minDistance = Math.min(...distances)
    const closestIndex = curve.findIndex(entry => input - entry[0] === minDistance)
    const [xBase, yBase] = curve[closestIndex]
    const xDiff = input - xBase

    const c1 = firstDegreeCoefficients[closestIndex]
    const c2 = secondDegreeCoefficients[closestIndex]
    const c3 = thirdDegreeCoefficients[closestIndex]

    if (xDiff === 0) return yBase
    if (closestIndex >= secondDegreeCoefficients.length) return yBase + c1 * xDiff
    return yBase + c1 * xDiff + c2 * xDiff * xDiff + c3 * xDiff * xDiff * xDiff
  }
}

function targetedLumaAdjustment(
  target: number,
  adjustment: number,
  range: number = 100,
): MapPixelFn {
  // Use Cosine function to determine how much to apply the adjustment
  // Remap the range (-R, R) to (-pi/2, pi/2)
  const cosine0 = Math.PI / 2

  return pixel => {
    if (pixel.channel !== ColorChannel.Luma) return pixel.value!

    const rawDistance = pixel.value! - target
    const cappedDistance = Math.min(range, Math.max(-range, rawDistance))
    const cosineDistance = (cappedDistance / range) * cosine0
    return Math.cos(cosineDistance) * adjustment + pixel.value!
  }
}

export function tone(imageData: IAnnotatedImageData, options: IToneOptions): IAnnotatedImageData {
  const {colorspace} = imageData
  const fns: MapPixelFn[] = []

  // Convert the image to YCbCr colorspace to just operate on luma channel
  if (imageData.colorspace !== Colorspace.Greyscale) imageData = ImageData.toYCbCr(imageData)

  if (options.contrast) fns.push(contrast(options))
  if (options.whites) fns.push(targetedLumaAdjustment(223, options.whites, 30))
  if (options.highlights) fns.push(targetedLumaAdjustment(192, options.highlights))
  if (options.midtones) fns.push(targetedLumaAdjustment(128, options.midtones))
  if (options.shadows) fns.push(targetedLumaAdjustment(64, options.shadows))
  if (options.blacks) fns.push(targetedLumaAdjustment(32, options.blacks, 30))
  if (options.curve) fns.push(curves(options))

  return ImageData.toColorspace(mapPixels(imageData, fns), colorspace)
}
