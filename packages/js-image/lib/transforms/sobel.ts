/* tslint:disable */
import {Pixel} from '../types'
import {ImageData} from '../image-data'

function toNearestAngle(xVal: number, yVal: number): number {
  const angle = Math.atan2(yVal, xVal) * 180 / Math.PI
  return (Math.round(angle / 45) * 45 + 180) % 180
}

function getOffsetsForAngle(angle: number): Pixel[] {
  switch (angle) {
    case 0:
      return [{x: -1, y: 0}, {x: 1, y: 0}]
    case 45:
      return [{x: -1, y: 1}, {x: 1, y: -1}]
    case 90:
      return [{x: 0, y: -1}, {x: 0, y: 1}]
    case 135:
      return [{x: 1, y: 1}, {x: -1, y: -1}]
    default:
      throw new Error(`invalid angle: ${angle}`)
  }
}

export function getPixelsForAngle(
  imageData: ImageData,
  srcX: number,
  srcY: number,
  angle: number,
): Pixel[] {
  const offsets = getOffsetsForAngle(angle)
  const pixels: Pixel[] = []
  for (var i = 0; i < offsets.length; i++) {
    var x = srcX + offsets[i].x
    var y = srcY + offsets[i].y
    var index = y * imageData.width + x
    pixels.push({x, y, index, value: imageData.data[index]})
  }

  return pixels
}

export interface SobelImageData extends ImageData {
  angles: Uint8Array
}

export function sobel(origImageData: ImageData): SobelImageData {
  const xMatrix = [1, 0, -1, 2, 0, -2, 1, 0, -1]
  const yMatrix = [1, 2, 1, 0, 0, 0, -1, -2, -1]

  const imageData = ImageData.toGreyscale(origImageData)
  const srcPixels = imageData.data
  const dstPixels = new Uint8Array(srcPixels.length)
  const dstAngles = new Uint8Array(srcPixels.length)

  const imageWidth = imageData.width
  const imageHeight = imageData.height

  const matrixWidth = Math.sqrt(xMatrix.length)
  const matrixHalfWidth = Math.floor(matrixWidth / 2)

  var dstIndex = 0
  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < imageWidth; x++) {
      var xVal = 0
      var yVal = 0
      if (x - matrixHalfWidth < 0 ||
          y - matrixHalfWidth < 0 ||
          x + matrixHalfWidth >= imageWidth ||
          y + matrixHalfWidth >= imageHeight) {
        dstPixels[dstIndex] = 0
        dstAngles[dstIndex] = 0
        dstIndex++
        continue
      }

      for (var matrixY = 0; matrixY < matrixWidth; matrixY++) {
        for (var matrixX = 0; matrixX < matrixWidth; matrixX++) {
          const srcX = x + matrixX - matrixHalfWidth
          const srcY = y + matrixY - matrixHalfWidth
          const srcOffset = srcY * imageWidth + srcX

          const matrixOffset = matrixY * matrixWidth + matrixX
          const xWeight = xMatrix[matrixOffset]
          const yWeight = yMatrix[matrixOffset]

          xVal += srcPixels[srcOffset] * xWeight
          yVal += srcPixels[srcOffset] * yWeight
        }
      }

      dstPixels[dstIndex] = Math.round(Math.sqrt(xVal * xVal + yVal * yVal))
      dstAngles[dstIndex] = toNearestAngle(xVal, yVal)
      dstIndex++
    }
  }

  return Object.assign({}, imageData, {
    data: dstPixels,
    angles: dstAngles,
  })
}
