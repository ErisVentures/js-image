/* tslint:disable */
import {Pixel, ISobelOptions} from '../types'
import {IAnnotatedImageData, ImageData} from '../image-data'

function toNearestAngle(xVal: number, yVal: number): number {
  const angle = (Math.atan2(yVal, xVal) * 180) / Math.PI
  return (Math.round(angle / 45) * 45 + 180) % 180
}

function totalMatrixWeight(matrix: number[]): number {
  let weight = 0
  for (let i = 0; i < matrix.length; i++) {
    weight += Math.max(matrix[i], 0)
  }
  return weight
}

export function generateWeightMatrix(radius: number, isX: boolean): number[] {
  const maxDistToMax = 2 * radius - 1

  let index = 0
  let matrix = []
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (y === 0) {
        matrix[index] = 0
      } else {
        const distToMax = Math.abs(x) + Math.abs(y) - 1
        const weight = Math.pow(2, maxDistToMax - distToMax)
        matrix[index] = -1 * Math.sign(y) * weight
      }

      index++
    }
  }

  if (isX) {
    const matrixWidth = 2 * radius + 1
    const rotatedMatrix = new Array(matrix.length)
    ImageData.rotateArray(matrix, rotatedMatrix, matrixWidth, matrixWidth, 90)
    matrix = rotatedMatrix
  }

  return matrix
}

export interface SobelImageData extends IAnnotatedImageData {
  // contains the angles of the direction of the gradient (i.e. the difference in luminance)
  angles: Uint8Array
}

export function sobel(origImageData: IAnnotatedImageData, options?: ISobelOptions): SobelImageData {
  const radius = (options && options.radius) || 1
  const xMatrix = generateWeightMatrix(radius, true)
  const yMatrix = generateWeightMatrix(radius, false)
  const totalWeight = totalMatrixWeight(xMatrix)

  const imageData = ImageData.toGreyscale(origImageData)
  const srcPixels = imageData.data
  const dstPixels = new Uint8Array(srcPixels.length)
  const dstAngles = new Uint8Array(srcPixels.length)

  const imageWidth = imageData.width
  const imageHeight = imageData.height

  const matrixWidth = 2 * radius + 1
  const matrixHalfWidth = Math.floor(matrixWidth / 2)

  var dstIndex = 0
  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < imageWidth; x++) {
      var xVal = 0
      var yVal = 0
      if (ImageData.isBorder(imageData, x, y, matrixHalfWidth)) {
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

          xVal += (srcPixels[srcOffset] * xWeight) / totalWeight
          yVal += (srcPixels[srcOffset] * yWeight) / totalWeight
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
