/* tslint:disable */
import {IBlurOptions, BufferLike} from '../types'
import {ImageData} from '../image-data'
import {convolve} from './convolve'

function weightsForGauss(sigma: number): number[][] {
  var width = 4 * (sigma - 1)
  if (width % 2 === 0) {
    width++
  }

  const center = Math.floor(width / 2)
  const denominator = 2 * sigma * sigma
  const weights = []
  for (var y = 0; y < width; y++) {
    const row = []
    for (var x = 0; x < width; x++) {
      const xComponent = Math.pow(y - center, 2) / denominator
      const yComponent = Math.pow(x - center, 2) / denominator
      row[x] = Math.exp(-1 * (xComponent + yComponent))
    }
    weights.push(row)
  }
  return weights
}

// Taken from http://www.peterkovesi.com/matlabfns/Spatial/solveinteg.m
function approximateWidthsForGauss(sigma: number, n: number): number[] {
  // Ideal averaging filter width
  const idealWidth = Math.sqrt((12 * sigma * sigma / n) + 1)
  var lowerWidth = Math.floor(idealWidth)
  if (lowerWidth % 2 === 0) {
    lowerWidth--
  }

  const upperWidth = lowerWidth + 2
  const sigma12 = 12 * sigma * sigma
  const totalArea = n * lowerWidth * lowerWidth
  const mIdeal = (sigma12 - totalArea - 4 * n * lowerWidth - 3 * n) / (-4 * lowerWidth - 4)

  const sizes = []
  for (var i = 0; i < n; i++) {
    sizes.push(i < mIdeal ? lowerWidth : upperWidth)
  }
  return sizes
}

function boxBlur1D(
  firstMax: number,
  secondMax: number,
  channels: number,
  getIndex: (i: number, j: number, c: number) => number,
  srcPixels: BufferLike,
  radius: number,
): Uint8Array {
  const weight = radius * 2 + 1
  const outPixels = new Uint8Array(srcPixels.length)

  for (var i = 0; i < firstMax; i++) {
    for (var channel = 0; channel < channels; channel++) {
      const firstValueIndex = getIndex(i, 0, channel)
      const lastValueIndex = getIndex(i, secondMax - 1, channel)
      const firstValue = srcPixels[firstValueIndex]
      const lastValue = srcPixels[lastValueIndex]

      var value = firstValue * (radius + 1)
      for (var j = 0; j < radius; j++) {
        const index = getIndex(i, j, channel)
        value += srcPixels[index]
      }

      for (var j = 0; j <= radius; j++) {
        const index = getIndex(i, j, channel)
        const nextIndex = getIndex(i, j + radius, channel)
        value += srcPixels[nextIndex] - firstValue
        outPixels[index] = value / weight
      }

      for (var j = radius + 1; j < secondMax - radius; j++) {
        const index = getIndex(i, j, channel)
        const nextIndex = getIndex(i, j + radius, channel)
        const falloffIndex = getIndex(i, j - radius - 1, channel)
        value += srcPixels[nextIndex] - srcPixels[falloffIndex]
        outPixels[index] = value / weight
      }

      for (var j = secondMax - radius; j < secondMax; j++) {
        const index = getIndex(i, j, channel)
        const falloffIndex = getIndex(i, j - radius, channel)
        value += lastValue - srcPixels[falloffIndex]
        outPixels[index] = value / weight
      }
    }
  }

  return outPixels
}

export function boxBlur(imageData: ImageData, options: IBlurOptions): ImageData {
  var radius = options.radius!
  if (!radius) {
    radius = Math.ceil(imageData.width / 1000)
  }

  const intermediate = boxBlur1D(
    imageData.width,
    imageData.height,
    imageData.channels,
    (i: number, j: number, c: number) => ImageData.indexFor(imageData, i, j, c),
    imageData.data,
    radius,
  )

  const outPixels = boxBlur1D(
    imageData.height,
    imageData.width,
    imageData.channels,
    (j: number, i: number, c: number) => ImageData.indexFor(imageData, i, j, c),
    intermediate,
    radius,
  )

  for (var i = 0; i < outPixels.length; i++) {
    outPixels[i] = Math.round(outPixels[i])
  }

  return Object.assign({}, imageData, {data: outPixels})
}

export function gaussianBlur(imageData: ImageData, options: IBlurOptions): ImageData {
  var sigma = options.sigma!
  if (!sigma) {
    const radius = options.radius || 2
    sigma = 1 + radius / 2
  }

  const approximate = typeof options.approximate === 'boolean' ?
    options.approximate :
    sigma >= 5

  if (approximate) {
    const widths = approximateWidthsForGauss(sigma, 3)
    var blurred = imageData
    widths.forEach(width => {
      blurred = boxBlur(blurred, {radius: (width - 1) / 2})
    })

    return blurred
  } else {
    const weights = weightsForGauss(sigma)
    return convolve(imageData, weights)
  }
}
