/* tslint:disable */
import {IBlurOptions, BufferLike} from '../types'
import {ImageData} from '../image-data'
import {convolve} from './convolve'

/**
 * Computes the convolution matrix weights for a gaussian blur of given sigma.
 * @see https://en.wikipedia.org/wiki/Gaussian_filter
 *
 * @param sigma
 */
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
      // Note that the 1 / 2π term can be omitted because it is constant with respect to x and y
      row[x] = Math.exp(-1 * (xComponent + yComponent))
    }
    weights.push(row)
  }
  return weights
}

/**
 * Gaussian blur can be approximated by a series of box blurs much faster than real gauss.
 * Inspired by https://www.peterkovesi.com/matlabfns/Spatial/solveinteg.m
 *
 * @param sigma The desired gaussian sigma
 * @param numPasses Total number of approximation passes to use
 */
function approximateWidthsForGauss(sigma: number, numPasses: number): number[] {
  const idealWidth = Math.sqrt((12 * sigma * sigma) / numPasses + 1)
  var lowerWidth = Math.floor(idealWidth)
  if (lowerWidth % 2 === 0) {
    lowerWidth--
  }

  const upperWidth = lowerWidth + 2
  const totalArea = numPasses * lowerWidth * lowerWidth
  const numPassesWithSmallerWidth =
    (12 * sigma * sigma - totalArea - 4 * numPasses * lowerWidth - 3 * numPasses) /
    (-4 * lowerWidth - 4)

  const sizes = []
  for (var i = 0; i < numPasses; i++) {
    sizes.push(i < numPassesWithSmallerWidth ? lowerWidth : upperWidth)
  }
  return sizes
}

/**
 *
 * @param iterationDimension The dimension to iterate over (i.e. width/height), pixels will **not** blur in this direction
 * @param blurDimension The dimension to blur over (i.e width/height), pixels **will** blur in this direction
 * @param channels
 * @param getIndex Function to get the index for a particular dimension pair and channel
 * @param srcPixels
 * @param radius
 */
function boxBlur1D(
  iterationDimension: number,
  blurDimension: number,
  channels: number,
  getIndex: (i: number, j: number, c: number) => number,
  srcPixels: BufferLike,
  radius: number,
): Uint8Array {
  // TODO: refactor this function to pass enum of blur direction
  // weight = box dimension = radius + center pixel + radius = 2r + 1
  const weight = radius * 2 + 1
  const outPixels = new Uint8Array(srcPixels.length)

  for (var i = 0; i < iterationDimension; i++) {
    for (var channel = 0; channel < channels; channel++) {
      const firstValueIndex = getIndex(i, 0, channel)
      const lastValueIndex = getIndex(i, blurDimension - 1, channel)
      const firstValue = srcPixels[firstValueIndex]
      const lastValue = srcPixels[lastValueIndex]

      // value will hold our average values and become the new pixel value
      var value = firstValue * (radius + 1)
      // compute the initial value
      for (var j = 0; j < radius; j++) {
        const index = getIndex(i, j, channel)
        value += srcPixels[index]
      }

      // Special handling for the first edge
      for (var j = 0; j <= radius; j++) {
        const index = getIndex(i, j, channel)
        const nextIndex = getIndex(i, j + radius, channel)
        value += srcPixels[nextIndex] - firstValue
        outPixels[index] = value / weight
      }

      // Blur the middle by sliding the box across the blurDimension
      for (var j = radius + 1; j < blurDimension - radius; j++) {
        const index = getIndex(i, j, channel)
        const nextIndex = getIndex(i, j + radius, channel)
        const falloffIndex = getIndex(i, j - radius - 1, channel)
        value += srcPixels[nextIndex] - srcPixels[falloffIndex]
        outPixels[index] = value / weight
      }

      // Special handling for the last edge
      for (var j = blurDimension - radius; j < blurDimension; j++) {
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

  // Blur vertically, i.e. iterate over all columns blurring within each column
  const intermediate = boxBlur1D(
    imageData.width,
    imageData.height,
    imageData.channels,
    (i: number, j: number, c: number) => ImageData.indexFor(imageData, i, j, c),
    imageData.data,
    radius,
  )

  // Blur horizontally, note that height/width and j/i are transposed here
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

  const approximate = typeof options.approximate === 'boolean' ? options.approximate : sigma >= 5

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
