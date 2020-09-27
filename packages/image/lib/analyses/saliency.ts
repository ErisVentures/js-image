import {IAnnotatedImageData, ImageData} from '../image-data'
import {SharpImage} from '../sharp-image'
import {Colorspace, IBlockifyOptions, IBlock, ISaliencyOptions} from '../types'

interface IColorData {
  pixel: [number, number, number]
  count: number
  globalColorContrast: number
}

function runMedianCut(
  pixels: Array<[number, number, number]>,
): [Array<[number, number, number]>, Array<[number, number, number]>] {
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
  ImageData.mapPixels(imageData, pixel => {
    primaryBucket.push(pixel.values as any)
    return pixel.values
  })

  let buckets = [primaryBucket]
  while (buckets.length < targetCount) {
    buckets = buckets.map(bucket => runMedianCut(bucket)).reduce((a, b) => a.concat(b), [] as any[])
  }

  return buckets.map(computeBucketAverage)
}

function pixelDistance(pixelA: [number, number, number], pixelB: [number, number, number]): number {
  return Math.sqrt(
    (pixelA[0] - pixelB[0]) ** 2 + (pixelA[1] - pixelB[1]) ** 2 + (pixelA[2] - pixelB[2]) ** 2,
  )
}

function getClosestQuantizedColor(
  colors: IColorData[],
  pixel: [number, number, number],
): {color: [number, number, number]; colorIndex: number} {
  let minIndex = 0
  let minValue = Infinity
  for (let i = 0; i < colors.length; i++) {
    const distance = pixelDistance(pixel, colors[i].pixel)
    if (distance < minValue) {
      minIndex = i
      minValue = distance
    }
  }

  return {color: colors[minIndex].pixel, colorIndex: minIndex}
}

function normalizeColorContrast(colors: IColorData[]): void {
  const colorDistances = colors.map(c => c.globalColorContrast)
  const maxDistance = Math.max(...colorDistances)
  const minDistance = Math.min(...colorDistances)

  for (const color of colors) {
    const contrastOutOf1 =
      (color.globalColorContrast - minDistance) / (maxDistance - minDistance + 0.0001)
    color.globalColorContrast = contrastOutOf1
  }
}

function quantizeImage(
  unquantizedImageData: IAnnotatedImageData,
  quantiles: number,
): {
  imageData: IAnnotatedImageData
  colors: IColorData[]
  colorIndexes: Uint8Array
} {
  const colors: IColorData[] = getQuantizedColors(unquantizedImageData, quantiles).map(pixel => ({
    pixel,
    count: 0,
    globalColorContrast: 0,
  }))
  const imageData = {...unquantizedImageData, data: new Uint8Array(unquantizedImageData.data)}
  const colorIndexes = new Uint8Array(imageData.width * imageData.height)

  let i = 0
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const pixel = ImageData.pixelFor(unquantizedImageData, x, y)
      const {color: quantized, colorIndex} = getClosestQuantizedColor(colors, pixel.values as any)
      colors[colorIndex].count++
      colorIndexes[i] = colorIndex
      imageData.data[pixel.index + 0] = quantized[0]
      imageData.data[pixel.index + 1] = quantized[1]
      imageData.data[pixel.index + 2] = quantized[2]
      i++
    }
  }

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i]
    for (let j = 0; j < colors.length; j++) {
      const otherColor = colors[j]
      color.globalColorContrast += otherColor.count * pixelDistance(color.pixel, otherColor.pixel)
    }
  }

  normalizeColorContrast(colors)

  return {
    colors,
    colorIndexes,
    imageData,
  }
}

function createSaliencyMap(
  imageData: IAnnotatedImageData,
  colors: IColorData[],
  colorIndexes: Uint8Array,
): IAnnotatedImageData {
  const saliencyMap = {
    ...imageData,
    channels: 1,
    colorspace: Colorspace.Greyscale,
    data: new Uint8Array(colorIndexes.length),
  }

  for (let i = 0; i < colorIndexes.length; i++) {
    const color = colors[colorIndexes[i]]
    saliencyMap.data[i] = Math.round(color.globalColorContrast * 255)
  }

  return saliencyMap
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
): Promise<{imageData: IAnnotatedImageData; quantized: IAnnotatedImageData; blocks: IBlock[]}> {
  const {quantizeBuckets = 32} = options
  const normalized = await SharpImage.toImageData(
    SharpImage.from(imageData)
      .normalize()
      .resize(400, 400, {fit: 'inside'}),
  )

  const {imageData: quantized, colors, colorIndexes} = quantizeImage(
    {...normalized, data: new Uint8Array(normalized.data)},
    quantizeBuckets,
  )
  ImageData.assert(quantized, [Colorspace.RGB])

  const saliencyMap = createSaliencyMap(quantized, colors, colorIndexes)
  const totalPixels = normalized.width * normalized.height
  const blocks: IBlock[] = colors.map(color => ({
    count: color.count / totalPixels,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    r: color.pixel[0],
    g: color.pixel[1],
    b: color.pixel[2],
  }))

  return {
    imageData: saliencyMap,
    quantized,
    blocks,
  }
}
