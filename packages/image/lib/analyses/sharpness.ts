/* tslint:disable */
import {ISharpness, ISharpnessOptions} from '../types'
import {ImageData} from '../image-data'
import {SobelImageData} from '../transforms/sobel'

export function computeAverage(items: number[], from?: number, to?: number): number {
  from = from || 0
  to = Math.min(to || items.length, items.length)

  var sum = 0
  for (var i = from; i < to; i++) {
    sum += items[i]
  }

  const numItems = to - from
  if (numItems === 0) return 0
  return sum / numItems
}

export function sharpness(imageData: SobelImageData, options?: ISharpnessOptions): ISharpness {
  const threshold = (options && options.threshold) || 20

  let edgePixelIntensities: number[] = []
  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
      var pixel = ImageData.valueFor(imageData, x, y)
      if (pixel > threshold) {
        edgePixelIntensities.push(pixel)
      }
    }
  }

  edgePixelIntensities = edgePixelIntensities.sort((a, b) => a - b)

  const percentEdges = edgePixelIntensities.length / imageData.data.length
  const lowerQuartile = edgePixelIntensities[Math.floor(edgePixelIntensities.length / 4)]
  const median = edgePixelIntensities[Math.floor(edgePixelIntensities.length / 2)]
  const upperQuartile = edgePixelIntensities[Math.floor((edgePixelIntensities.length * 3) / 4)]

  const ventileBucketSize = Math.ceil(edgePixelIntensities.length / 20)
  const lowerVentileAverage = computeAverage(edgePixelIntensities, 0, ventileBucketSize)
  const average = computeAverage(edgePixelIntensities)
  const upperVentileAverage = computeAverage(
    edgePixelIntensities,
    edgePixelIntensities.length - ventileBucketSize,
  )

  return {
    percentEdges,

    lowerQuartile,
    median,
    upperQuartile,

    lowerVentileAverage,
    average,
    upperVentileAverage,
  }
}
