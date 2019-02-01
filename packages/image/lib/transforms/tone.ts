/* tslint:disable */
import {IAnnotatedImageData, ImageData, IProximityAdjustment} from '../image-data'
import {MapPixelFn, IToneOptions, ColorChannel, Colorspace} from '../types'

function validateCurvesInput(curve?: number[][]): number[][] {
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

/**
 * Use monotonic cubic interpolation to map lightness values according to the provided curve.
 * @see https://en.wikipedia.org/wiki/Monotone_cubic_interpolation#Example_implementation
 * @param options
 */
function computeCurvesValues(curve: number[][]): number[] {
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

  const precomputedValues: number[] = []
  for (let yValue = 0; yValue <= 255; yValue++) {
    let closestIndex = -1
    for (let i = 0; i < curve.length; i++) {
      const curvePoint = curve[i][0]
      if (curvePoint > yValue) break
      closestIndex = i
    }

    if (closestIndex === -1) throw new Error('Error precomputing indexes')

    const [xBase, yBase] = curve[closestIndex]
    const xDiff = yValue - xBase

    const c1 = firstDegreeCoefficients[closestIndex]
    const c2 = secondDegreeCoefficients[closestIndex]
    const c3 = thirdDegreeCoefficients[closestIndex]

    let yPrime: number

    if (xDiff === 0) yPrime = yBase
    else if (closestIndex >= secondDegreeCoefficients.length) yPrime = yBase + c1 * xDiff
    else yPrime = yBase + c1 * xDiff + c2 * xDiff * xDiff + c3 * xDiff * xDiff * xDiff

    precomputedValues[yValue] = ImageData.clip(yPrime)
  }

  return precomputedValues
}

function runCurves(
  imageData: IAnnotatedImageData,
  precomputedValues: number[],
  channel: ColorChannel,
): IAnnotatedImageData {
  const channels = ImageData.channelsFor(imageData.colorspace)
  const indexOfChannel = channels.indexOf(channel)
  if (indexOfChannel === -1) throw new Error('Curves must operate on a channel in the image')

  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const offset = ImageData.indexFor(imageData, x, y, indexOfChannel)
      const yValue = imageData.data[offset]

      imageData.data[offset] = precomputedValues[yValue]
    }
  }

  return imageData
}

function flattenCurvesValues(unsafeCurves: number[][][]): number[] {
  const inputOutputMappings: number[][] = []
  for (const unsafeCurve of unsafeCurves) {
    const curve = validateCurvesInput(unsafeCurve)
    if (curve.every(([x, y]) => x === y)) continue
    inputOutputMappings.push(computeCurvesValues(curve))
  }

  if (!inputOutputMappings.length) return []

  const precomputedValues: number[] = []
  for (let initialYValue = 0; initialYValue <= 255; initialYValue++) {
    let finalYValue = initialYValue
    for (const phase of inputOutputMappings) {
      finalYValue = phase[finalYValue]
    }
    precomputedValues[initialYValue] = finalYValue
  }

  return precomputedValues
}

export function curves(
  imageData: IAnnotatedImageData,
  unsafeCurvesInput: number[][][] | number[][],
  channel: ColorChannel = ColorChannel.Luminance255,
): IAnnotatedImageData {
  // @ts-ignore - TODO: look into why this is being dumb
  unsafeCurvesInput = unsafeCurvesInput.filter((curve: number[] | number[][]) => curve.length)
  if (!unsafeCurvesInput.length) return imageData
  let unsafeCurves = unsafeCurvesInput as number[][][]
  if (typeof unsafeCurvesInput[0][0] === 'number') unsafeCurves = [unsafeCurvesInput as number[][]]
  const flattenedCurveValues = flattenCurvesValues(unsafeCurves)
  if (!flattenedCurveValues.length) return imageData
  if (flattenedCurveValues.length !== 256) throw new Error('Error computing flattened curve')
  return runCurves(imageData, flattenedCurveValues, channel)
}

function generateIdentityCurvesPoints(numPoints: number): number[][] {
  const curves: number[][] = []
  const increment = 255 / (numPoints - 1)
  for (let i = 0; i < numPoints; i++) {
    const value = Math.round(i * increment)
    curves.push([value, value])
  }

  return curves
}

function convertContrastToCurves({contrast = 0}: IToneOptions): number[][] {
  return [[0, 0], [64, 64 - contrast * 64], [192, 192 + contrast * 62], [255, 255]]
}

function convertToneToCurves(options: IToneOptions): number[][] {
  let hasAdjustment = false
  const cosine0 = Math.PI / 2
  const curves = generateIdentityCurvesPoints(32)

  function adjustCurvesTargetPoints(target: number, range: number, adjustment: number) {
    for (let i = 0; i < curves.length; i++) {
      const [x, y] = curves[i]
      const distanceRatio = Math.abs(target - x) / range
      if (distanceRatio >= 1) continue

      hasAdjustment = true
      const cosDistance = Math.cos(distanceRatio * cosine0)
      curves[i][1] = Math.min(255, Math.max(0, Math.round(y + adjustment * cosDistance)))
    }
  }

  if (options.whites) adjustCurvesTargetPoints(256, 32, options.whites)
  if (options.highlights) adjustCurvesTargetPoints(192, 64, options.highlights)
  if (options.midtones) adjustCurvesTargetPoints(128, 128, options.midtones)
  if (options.shadows) adjustCurvesTargetPoints(64, 64, options.shadows)
  if (options.blacks) adjustCurvesTargetPoints(0, 32, options.blacks)

  if (!hasAdjustment) return []
  return curves
}

function saturation(imageData: IAnnotatedImageData, options: IToneOptions): IAnnotatedImageData {
  imageData = ImageData.toHSL(imageData)

  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const index = ImageData.indexFor(imageData, x, y, 1)
      const saturation = imageData.data[index]
      imageData.data[index] = ImageData.clip(saturation * (1 + options.saturation!))
    }
  }

  return imageData
}

export function tone(imageData: IAnnotatedImageData, options: IToneOptions): IAnnotatedImageData {
  const {colorspace} = imageData

  const unsafeCurves: number[][][] = []
  const toneCurve = convertToneToCurves(options)
  if (toneCurve) unsafeCurves.push(toneCurve)
  if (options.contrast) unsafeCurves.push(convertContrastToCurves(options))
  if (options.curve) unsafeCurves.push(options.curve)
  if (unsafeCurves.length) {
    imageData = ImageData.toYCbCr(imageData)
    imageData = curves(imageData, unsafeCurves)
  }

  if (options.saturation) imageData = saturation(imageData, options)

  if (options.redCurve || options.greenCurve || options.blueCurve) {
    imageData = ImageData.toRGB(imageData)
    if (options.redCurve) curves(imageData, options.redCurve, ColorChannel.Red)
    if (options.greenCurve) curves(imageData, options.greenCurve, ColorChannel.Green)
    if (options.blueCurve) curves(imageData, options.blueCurve, ColorChannel.Blue)
  }

  return ImageData.toColorspace(imageData, colorspace)
}
