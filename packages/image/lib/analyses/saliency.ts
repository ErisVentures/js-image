import {IAnnotatedImageData, ImageData} from '../image-data'
import {SharpImage} from '../sharp-image'
import {Colorspace, IBlockifyOptions, IBlock, ISaliencyOptions} from '../types'
import * as tf from '@tensorflow/tfjs-node'

const SIGMAC = 16

type IBlockWithSaliency = IBlock & {saliency: number; contrast: number}

interface IColorData {
  pixel: [number, number, number]
  count: number
  saliency: {overall: number; contrast: number; positional: number}
  x: number
  y: number
  width: number
  height: number
  _mx: number
  _Vx: number
  _my: number
  _Vy: number
  __coordinates: number[]
  __xSum: number
  __ySum: number
  __xSumOfSquares: number
  __ySumOfSquares: number
  __countWeightedColorDistance: number
  __exponentialXWeightedColorDistance: number
  __exponentialYWeightedColorDistance: number
  __exponentialXVarianceWeightedColorDistance: number
  __exponentialYVarianceWeightedColorDistance: number
  __exponentialCountWeightedColorDistance: number
}

function runMedianCut(
  pixels: Array<[number, number, number]>,
): [Array<[number, number, number]>, Array<[number, number, number]>] {
  if (!pixels.length) return [[], []]

  const minPixel = [255, 255, 255]
  const maxPixel = [0, 0, 0]
  for (let i = 0; i < pixels.length; i++) {
    minPixel[0] = Math.min(pixels[i][0], minPixel[0])
    minPixel[1] = Math.min(pixels[i][1], minPixel[1])
    minPixel[2] = Math.min(pixels[i][2], minPixel[2])
    maxPixel[0] = Math.max(pixels[i][0], maxPixel[0])
    maxPixel[1] = Math.max(pixels[i][1], maxPixel[1])
    maxPixel[2] = Math.max(pixels[i][2], maxPixel[2])
  }

  const ranges = maxPixel.map((x, i) => x - minPixel[i])
  const maxRangeIndex = ranges.indexOf(Math.max(...ranges))
  const sortedOnIndex = pixels.slice().sort((a, b) => a[maxRangeIndex] - b[maxRangeIndex])
  const medianIndex = Math.floor(sortedOnIndex.length / 2)
  return [sortedOnIndex.slice(0, medianIndex), sortedOnIndex.slice(medianIndex)]
}

function computeCoordinateSum(nums: number[], start: number): number {
  let sum = 0
  for (let i = start; i < nums.length; i += 2) sum += nums[i]
  return sum
}
function computeCoordinateSumOfSquares(nums: number[], mean: number, start: number): number {
  let sum = 0
  for (let i = start; i < nums.length; i += 2) sum += (nums[i] - mean) ** 2
  return sum
}

function computeBucketAverage(bucket: Array<[number, number, number]>): [number, number, number] {
  const average: [number, number, number] = [0, 0, 0]
  for (const [r, g, b] of bucket) {
    average[0] += r
    average[1] += g
    average[2] += b
  }

  average[0] /= bucket.length
  average[1] /= bucket.length
  average[2] /= bucket.length

  return average
}

function getQuantizedColors(
  imageData: IAnnotatedImageData,
  targetCount: number,
): Array<[number, number, number]> {
  const primaryBucket: Array<[number, number, number]> = []
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const index = ImageData.indexFor(imageData, x, y)
      primaryBucket.push([
        imageData.data[index],
        imageData.data[index + 1],
        imageData.data[index + 2],
      ])
    }
  }

  let buckets = [primaryBucket]
  while (buckets.length < targetCount) {
    buckets = buckets.map(bucket => runMedianCut(bucket)).reduce((a, b) => a.concat(b), [] as any[])
  }

  const averagedBuckets = buckets.map(computeBucketAverage)
  return averagedBuckets
}

function pixelDifference(
  pixelA: [number, number, number],
  pixelB: [number, number, number],
): number {
  return (pixelA[0] - pixelB[0]) ** 2 + (pixelA[1] - pixelB[1]) ** 2 + (pixelA[2] - pixelB[2]) ** 2
}

function getClosestQuantizedColor(
  colors: IColorData[],
  pixel: [number, number, number],
): {color: [number, number, number]; colorIndex: number} {
  let minIndex = 0
  let minValue = Infinity
  for (let i = 0; i < colors.length; i++) {
    const distance = pixelDifference(pixel, colors[i].pixel)
    if (distance < minValue) {
      minIndex = i
      minValue = distance
    }
  }

  return {color: colors[minIndex].pixel, colorIndex: minIndex}
}

function computeColorData(colors: IColorData[]): void {
  for (const color of colors) {
    color.__xSum = computeCoordinateSum(color.__coordinates, 0)
    color.__ySum = computeCoordinateSum(color.__coordinates, 1)
  }

  for (const color of colors) {
    for (const otherColor of colors) {
      const colorDifference = pixelDifference(color.pixel, otherColor.pixel)
      const colorDistance = Math.sqrt(colorDifference)

      // Weighted color distance, used for global color contrast
      color.__countWeightedColorDistance += otherColor.count * colorDistance

      // Exponential color difference, used in size and position calculations
      const exponentialColorDifference = Math.exp(-colorDifference / (2 * SIGMAC))

      color.__exponentialXWeightedColorDistance += exponentialColorDifference * otherColor.__xSum
      color.__exponentialYWeightedColorDistance += exponentialColorDifference * otherColor.__ySum
      color.__exponentialCountWeightedColorDistance += otherColor.count * exponentialColorDifference
    }

    color._mx =
      color.__exponentialXWeightedColorDistance / color.__exponentialCountWeightedColorDistance
    color._my =
      color.__exponentialYWeightedColorDistance / color.__exponentialCountWeightedColorDistance
  }

  for (const color of colors) {
    color.__xSumOfSquares = computeCoordinateSumOfSquares(color.__coordinates, color._mx, 0)
    color.__ySumOfSquares = computeCoordinateSumOfSquares(color.__coordinates, color._my, 1)
  }

  for (const color of colors) {
    for (const otherColor of colors) {
      const colorDifference = pixelDifference(color.pixel, otherColor.pixel)
      const exponentialColorDifference = Math.exp(-colorDifference / (2 * SIGMAC))

      color.__exponentialXVarianceWeightedColorDistance +=
        exponentialColorDifference * otherColor.__xSumOfSquares
      color.__exponentialYVarianceWeightedColorDistance +=
        exponentialColorDifference * otherColor.__ySumOfSquares
    }

    color._Vx =
      color.__exponentialXVarianceWeightedColorDistance /
      color.__exponentialCountWeightedColorDistance
    color._Vy =
      color.__exponentialYVarianceWeightedColorDistance /
      color.__exponentialCountWeightedColorDistance
  }
}

function normalizeColorData(imageData: IAnnotatedImageData, colors: IColorData[]): void {
  const colorDistances = colors.map(c => c.__countWeightedColorDistance)
  const maxDistance = Math.max(...colorDistances)
  const minDistance = Math.min(...colorDistances)

  // Size and probability constants.
  const meanVector = tf.tensor([0.5555, 0.6449, 0.0002, 0.0063])
  const covarianceMatrix = tf.tensor([
    [43.3777, 1.7633, -0.4059, 1.0997],
    [1.7633, 40.7221, -0.0165, 0.0447],
    [-0.4059, -0.0165, 87.0455, -3.2744],
    [1.0997, 0.0447, -3.2744, 125.1503],
  ])

  for (const color of colors) {
    const contrastOutOf1 =
      (color.__countWeightedColorDistance - minDistance) / (maxDistance - minDistance + 0.0001)
    color.saliency.contrast = contrastOutOf1

    const centerX = color._mx / imageData.width - 0.5
    const centerY = color._my / imageData.height - 0.5
    const width = Math.sqrt(color._Vx * 12) / imageData.width
    const height = Math.sqrt(color._Vy * 12) / imageData.height

    const shapeVector = tf.tensor([width, height, centerX, centerY])
    const X = shapeVector.transpose().sub(meanVector)
    const Y = X
    const A = covarianceMatrix
    const result = X.dot(A)
      .mul(Y)
      .sum(0)
      .dataSync()

    color.x = clip01(centerX - width / 2)
    color.y = clip01(centerY - height / 2)
    color.width = clip01(centerX + width / 2 - color.x)
    color.height = clip01(centerY + height / 2 - color.y)
    color.saliency.positional = Math.exp(-result[0] / 2)
  }

  const sizeProbability = colors.map(c => c.saliency.positional)
  const minProbability = Math.min(...sizeProbability)
  const maxProbability = Math.max(...sizeProbability, 0.5)
  for (const color of colors) {
    const sizeProbability =
      (color.saliency.positional - minProbability) / (maxProbability - minProbability + 0.00001)
    color.saliency.positional = sizeProbability
    color.saliency.overall = Math.pow(
      color.saliency.contrast ** 3 * color.saliency.positional,
      1 / 4,
    )
  }

  const sizeSaliency = colors.map(c => c.saliency.overall)
  const minSaliency = Math.min(...sizeSaliency)
  const maxSaliency = Math.max(...sizeSaliency)
  for (const color of colors) {
    color.saliency.overall =
      (color.saliency.overall - minSaliency) / (maxSaliency - minSaliency + 0.00001)
  }
}

function initializeColorData(pixel: [number, number, number]): IColorData {
  return {
    pixel,
    count: 0,
    saliency: {overall: 0, contrast: 0, positional: 0},
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    __xSum: 0,
    __ySum: 0,
    __xSumOfSquares: 0,
    __ySumOfSquares: 0,
    __countWeightedColorDistance: 0,
    __exponentialXWeightedColorDistance: 0,
    __exponentialYWeightedColorDistance: 0,
    __exponentialXVarianceWeightedColorDistance: 0,
    __exponentialYVarianceWeightedColorDistance: 0,
    __exponentialCountWeightedColorDistance: 0,
    __coordinates: [],
    _mx: 0,
    _Vx: 0,
    _my: 0,
    _Vy: 0,
  }
}

/**
 * This method quantizes the image and precomputes some useful data per color.
 *
 *    1. Create histograms and find the quantized colors using median cuts.
 *    2. For all pixels...
 *          - Replace it with the quantized version.
 *          - Keep track of the correct quantized color index.
 *          - Compute the average x/y for each color (weighted by similarity to other colors by distance).
 *    3. Do one more pass over the pixels to compute x/y variance.
 *    4. For all quantized colors...
 *          - Compute color distance.
 *          - Compute exponential color distance.
 *          - Compute weighted exponential color distance.
 *          - Compute weighted color distance (global color contrast).
 */
function precomputeColorData(
  unquantizedImageData: IAnnotatedImageData,
  quantiles: number,
): {
  imageData: IAnnotatedImageData
  colors: IColorData[]
  colorIndexes: Uint8Array
} {
  const colors = getQuantizedColors(unquantizedImageData, quantiles).map(initializeColorData)
  const imageData = {...unquantizedImageData, data: new Uint8Array(unquantizedImageData.data)}
  const colorIndexes = new Uint8Array(imageData.width * imageData.height)

  let i = 0
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const index = ImageData.indexFor(unquantizedImageData, x, y)
      const {color: quantized, colorIndex} = getClosestQuantizedColor(colors, [
        imageData.data[index + 0],
        imageData.data[index + 1],
        imageData.data[index + 2],
      ])
      colors[colorIndex].count++
      colors[colorIndex].__coordinates.push(x, y)
      colorIndexes[i] = colorIndex
      imageData.data[index + 0] = quantized[0]
      imageData.data[index + 1] = quantized[1]
      imageData.data[index + 2] = quantized[2]
      i++
    }
  }

  computeColorData(colors)
  normalizeColorData(imageData, colors)

  return {
    colors,
    colorIndexes,
    imageData,
  }
}

function clip01(x: number): number {
  if (x > 1) return 1
  if (x < 0) return 0
  return x
}

function createSaliencyMaps(
  imageData: IAnnotatedImageData,
  colors: IColorData[],
  colorIndexes: Uint8Array,
): {
  imageData: IAnnotatedImageData
  contrastImageData: IAnnotatedImageData
  positionImageData: IAnnotatedImageData
} {
  const saliencyMap = {
    ...imageData,
    channels: 1,
    colorspace: Colorspace.Greyscale,
    data: new Uint8Array(colorIndexes.length),
  }
  const contrastImageData = {
    ...imageData,
    channels: 1,
    colorspace: Colorspace.Greyscale,
    data: new Uint8Array(colorIndexes.length),
  }
  const positionImageData = {
    ...imageData,
    channels: 1,
    colorspace: Colorspace.Greyscale,
    data: new Uint8Array(colorIndexes.length),
  }

  for (let i = 0; i < colorIndexes.length; i++) {
    const color = colors[colorIndexes[i]]
    saliencyMap.data[i] = Math.round(color.saliency.overall * 255)
    contrastImageData.data[i] = Math.round(color.saliency.contrast * 255)
    positionImageData.data[i] = Math.round(color.saliency.positional * 255)
  }

  return {imageData: saliencyMap, contrastImageData, positionImageData}
}

/**
 * This version is inspired by the methods used by FASA (Fast, Accurate, and Size-Aware Salient Object Detection).
 * Here's the general idea.
 *
 *    1. Quantize the image into a much smaller colorspace (64 colors)
 *    2. For each quantized color, compute the centroid, x-variance, and y-variance.
 *       This provides center coordinates and a rough width/height for each color.
 *    3. Using the location and size, compute the saliency probability of each quantized block
 *       using the pixel-weighted gaussian distribution values.
 *    4. For each quantized color, compute a global color contrast value.
 *    5. Combine the probability using saliency from location/size and global color contrast.
 *
 * IDEA: We can do better than 1 box per quantized color, add some tests and logic for k-means clustering.
 *       If the *density* of a quanitzed color is low, try k+1 centroids and recheck density.
 *       If density does not improve much, stick with k centroids, otherwise repeat.
 *
 * @see https://github.com/mpatacchiola/deepgaze/blob/fddc129da9692d7a2002d0df5baf142eae3b722b/deepgaze/saliency_map.py
 * @see https://projet.liris.cnrs.fr/imagine/pub/proceedings/ACCV-2014/pages/PDF/544.pdf
 * @see https://www.epfl.ch/labs/ivrl/research/saliency/fast-saliency/
 */
export async function saliency(
  imageData: IAnnotatedImageData,
  options: ISaliencyOptions = {},
): Promise<{
  imageData: IAnnotatedImageData
  quantized: IAnnotatedImageData
  contrastImageData: IAnnotatedImageData
  positionImageData: IAnnotatedImageData
  blocks: IBlockWithSaliency[]
}> {
  const {quantizeBuckets = 64} = options
  const normalized = await SharpImage.toImageData(
    SharpImage.from(imageData)
      .normalize()
      .resize(400, 400, {fit: 'inside'}),
  )

  const {imageData: quantized, colors, colorIndexes} = precomputeColorData(
    {...normalized, data: new Uint8Array(normalized.data)},
    quantizeBuckets,
  )
  ImageData.assert(quantized, [Colorspace.RGB])

  const totalPixels = normalized.width * normalized.height
  const blocks: IBlockWithSaliency[] = colors.map(color => ({
    count: color.count / totalPixels,
    x: color.x,
    y: color.y,
    width: color.width,
    height: color.height,
    r: color.pixel[0],
    g: color.pixel[1],
    b: color.pixel[2],
    saliency: color.saliency.overall,
    contrast: color.saliency.contrast,
  }))

  const returnValue = {
    ...createSaliencyMaps(quantized, colors, colorIndexes),
    quantized,
    blocks,
  }

  const blurredSaliency = await SharpImage.toImageData(
    SharpImage.from(returnValue.imageData).blur(1),
  )

  const thresholdSaliency = ImageData.mapPixels(blurredSaliency, pixel =>
    pixel.values[0] < 96 ? [0, 0, 0] : pixel.values,
  )

  return {
    ...returnValue,
    imageData: thresholdSaliency,
  }
}
