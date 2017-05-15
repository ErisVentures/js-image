/* tslint:disable */
import {ImageData} from '../image-data'

export type FlatMatrix = number[]
export type DeepMatrix = number[][]
export type Matrix = FlatMatrix|DeepMatrix

function isDeepMatrix(matrix: Matrix): matrix is DeepMatrix {
  return Array.isArray(matrix[0])
}

export function ensureFlatMatrix(matrix: Matrix): FlatMatrix {
  if (!matrix.length) {
    throw new Error('Matrix must have length')
  }

  let flatMatrix: FlatMatrix = matrix as FlatMatrix
  if (isDeepMatrix(matrix)) {
    flatMatrix = matrix.reduce((acc: any, arr: any) => acc.concat(arr), [])
  }

  const matrixSize = Math.sqrt(flatMatrix.length)
  if (matrixSize !== Math.round(matrixSize)) {
    throw new Error('Matrix must be square')
  }

  return flatMatrix
}

export default function convolve(imageData: ImageData, flatOrDeepMatrix: Matrix): ImageData {
  const matrix = ensureFlatMatrix(flatOrDeepMatrix)

  const srcPixels = imageData.data
  const dstPixels = []

  const imageWidth = imageData.width
  const imageHeight = imageData.height

  const matrixWidth = Math.sqrt(matrix.length)
  const matrixHalfWidth = Math.floor(matrixWidth / 2)

  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < imageWidth; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      let totalWeight = 0
      for (var matrixY = 0; matrixY < matrixWidth; matrixY++) {
        for (var matrixX = 0; matrixX < matrixWidth; matrixX++) {
          const srcX = x + matrixX - matrixHalfWidth
          const srcY = y + matrixY - matrixHalfWidth
          if (srcX >= 0 && srcY >= 0 && srcX < imageWidth && srcY < imageHeight) {
            const srcOffset = (srcY * imageWidth + srcX) * 4
            const weight = matrix[matrixY * matrixWidth + matrixX]
            totalWeight += weight
            r += srcPixels[srcOffset] * weight
            g += srcPixels[srcOffset + 1] * weight
            b += srcPixels[srcOffset + 2] * weight
            a += srcPixels[srcOffset + 3] * weight
          }
        }
      }

      dstPixels.push(
        Math.round(r / totalWeight),
        Math.round(g / totalWeight),
        Math.round(b / totalWeight),
        Math.round(a / totalWeight)
      )
    }
  }

  return Object.assign({}, imageData, {data: new Uint8Array(dstPixels)})
}
