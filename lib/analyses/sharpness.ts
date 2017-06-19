/* tslint:disable */
import {Pixel, ISharpnessOptions} from '../types'
import {ImageData} from '../image-data'
import {SobelImageData} from '../transforms/sobel'

export interface SharpnessData {
  width: number,
  height: number,
  data: Uint8Array,
}

function evaluateSharpnessAt(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  angle: number,
  radius: number,
  boxSize: number,
): number {
  var boxRadius = Math.floor(boxSize / 2)
  var offsetForAngle = ImageData.getOffsetForAngle(angle)
  var orthogonalOffsetForAngle = ImageData.getOffsetForAngle((angle + 90) % 180)

  var totalChannelDifference = 0
  for (var channel = 0; channel < imageData.channels; channel++) {
    var totalValues = 0
    var totalWeight = 0
    for (var i = -radius; i <= radius; i++) {
      if (i === 0) {
        continue
      }

      var weight = Math.sign(i) * Math.pow(2, radius - Math.abs(i))
      if (weight > 0) {
        totalWeight += weight * (boxRadius * 2 + 1)
      }

      for (var j = -boxRadius; j <= boxRadius; j++) {
        var x = centerX + offsetForAngle.x * i + orthogonalOffsetForAngle.x * j
        var y = centerY + offsetForAngle.y * i + orthogonalOffsetForAngle.y * j
        var index = ImageData.indexFor(imageData, x, y, channel)
        totalValues += imageData.data[index] * weight
      }
    }

    totalChannelDifference += Math.abs(Math.round(totalValues / totalWeight))
  }

  return Math.round(totalChannelDifference / imageData.channels)
}

export function sharpness(imageData: ImageData, edgeMask: SobelImageData, options?: ISharpnessOptions): SharpnessData {
  imageData = ImageData.toGreyscale(imageData)

  const edgeMaskScale = imageData.width / edgeMask.width
  if (edgeMaskScale * edgeMask.height !== imageData.height) {
    throw new Error('Edge mask must have the same ratio')
  }

  const threshold = options && options.edgeMaskThreshold || 20
  const radius = options && options.radius || 1

  const sharpnessArray = new Uint8Array(edgeMask.data.length)
  for (var maskY = 0; maskY < edgeMask.height; maskY++) {
    for (var maskX = 0; maskX < edgeMask.width; maskX++) {
      var edgeMaskIndex = maskY * edgeMask.width + maskX
      var edgeMaskValue = edgeMask.data[edgeMaskIndex]
      if (edgeMaskValue < threshold) {
        continue
      }

      var edgeAngle = edgeMask.angles[edgeMaskIndex]
      var offsetForAngle = ImageData.getOffsetForAngle(edgeAngle)
      var originalX = edgeMaskScale * maskX
      var originalY = edgeMaskScale * maskY

      var maximumSharpness = 0
      for (var i = -edgeMaskScale; i < edgeMaskScale * 2; i++) {
        var centerX = originalX + offsetForAngle.x * i
        var centerY = originalY + offsetForAngle.y * i
        if (edgeAngle === 45) {
          centerX += edgeMaskScale * 2
        }

        var sharpness = evaluateSharpnessAt(
          imageData,
          centerX,
          centerY,
          edgeAngle,
          radius,
          edgeMaskScale
        )

        maximumSharpness = Math.max(maximumSharpness, sharpness)
      }

      sharpnessArray[edgeMaskIndex] = maximumSharpness
    }
  }

  return {
    width: edgeMask.width,
    height: edgeMask.height,
    data: sharpnessArray,
  }
}
