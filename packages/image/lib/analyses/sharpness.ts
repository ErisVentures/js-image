/* tslint:disable */
import {Pixel, ISharpness, ISharpnessOptions} from '../types'
import {ImageData} from '../image-data'
import {SobelImageData} from '../transforms/sobel'

function computeAverage(items: number[], from?: number, to?: number): number {
  from = from || 0
  to = Math.min(to || items.length, items.length)

  var sum = 0
  for (var i = from; i < to; i++) {
    sum += items[i]
  }

  return sum / (to - from)
}

export function sharpness(imageData: SobelImageData, options?: ISharpnessOptions): ISharpness  {
  const threshold = options && options.threshold || 20

  let edges: number[] = []
  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
      var pixel = ImageData.valueFor(imageData, x, y)
      if (pixel > threshold) {
        edges.push(pixel)
      }
    }
  }

  edges = edges.sort((a, b) => a - b)

  const percentEdges = edges.length / imageData.data.length
  const lowerQuartile = edges[Math.floor(edges.length / 4)]
  const median = edges[Math.floor(edges.length / 2)]
  const upperQuartile = edges[Math.floor(edges.length * 3 / 4)]

  const lowerVentileAverage = computeAverage(edges, 0, Math.ceil(edges.length / 20))
  const average = computeAverage(edges)
  const upperVentileAverage = computeAverage(edges, Math.floor(edges.length * 19 / 20))

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
