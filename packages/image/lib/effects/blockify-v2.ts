import {IAnnotatedImageData, ImageData} from '../image-data'
import {SharpImage} from '../sharp-image'
import {Colorspace, IBlockifyOptions, IBlock} from '../types'

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

function getClosestQuantizedColor(
  colors: Array<[number, number, number]>,
  pixel: [number, number, number],
): [number, number, number] {
  const computeDistance = (a: [number, number, number], b: [number, number, number]) =>
    Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
  return colors.sort((a, b) => computeDistance(pixel, a) - computeDistance(pixel, b))[0]
}

function convertToColorspace(
  imageData: IAnnotatedImageData,
  quantiles: number,
): IAnnotatedImageData {
  const colors = getQuantizedColors(imageData, quantiles)
  return ImageData.mapPixels(imageData, pixel => {
    return getClosestQuantizedColor(colors, pixel.values as any)
  })
}

export async function blockify2(
  imageData: IAnnotatedImageData,
  options: IBlockifyOptions = {},
): Promise<{imageData: IAnnotatedImageData; blocks: IBlock[]}> {
  const {blurRadius: blurRadiusRaw = 'auto'} = options
  const blurRadius =
    blurRadiusRaw === 'auto' ? Math.min(imageData.width, imageData.height) / 40 : blurRadiusRaw
  const blurred =
    blurRadius === 0
      ? ImageData.toRGB(imageData)
      : await SharpImage.toImageData(
          SharpImage.from(imageData)
            .normalize()
            .blur(blurRadius / 2 + 1)
            .resize(400, 400, {fit: 'inside'}),
        )

  const output = convertToColorspace({...blurred, data: new Uint8Array(blurred.data)}, 8)
  ImageData.assert(output, [Colorspace.RGB])

  const blocks: IBlock[] = [{count: 1, x: 0, y: 0, width: 1, height: 1, r: 0, g: 0, b: 0}]

  return {
    imageData: output,
    blocks,
  }
}
