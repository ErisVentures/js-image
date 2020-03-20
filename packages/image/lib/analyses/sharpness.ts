import {ISharpnessAnalysis, ISharpnessOptions} from '../types'
import {ImageData} from '../image-data'
import {SobelImageData} from '../transforms/sobel'
import {instrumentation} from '../instrumentation'

export function computeAverage(items: number[], from?: number, to?: number): number {
  from = from || 0
  to = Math.min(to || items.length, items.length)

  let sum = 0
  for (let i = from; i < to; i++) {
    sum += items[i]
  }

  const numItems = to - from
  if (numItems === 0) return 0
  return sum / numItems
}

function sharpness_(imageData: SobelImageData, options?: ISharpnessOptions): ISharpnessAnalysis {
  const defaultSubselect = {x: 0, y: 0, width: imageData.width, height: imageData.height}
  const {threshold = 20, subselect = defaultSubselect} = options || {}
  const maxX = subselect.x + subselect.width
  const maxY = subselect.y + subselect.height

  let edgePixelIntensities: number[] = []
  for (let y = subselect.y; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const pixel = ImageData.valueFor(imageData, x, y)
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

export const sharpness = instrumentation.wrapMethod('computeSharpness', sharpness_)
