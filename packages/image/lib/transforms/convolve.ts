/* tslint:disable */
import {ensureFlatMatrix, Matrix} from '../matrix'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {Colorspace} from '../types'

export function convolve(
  imageData: IAnnotatedImageData,
  flatOrDeepMatrix: Matrix,
): IAnnotatedImageData {
  if (imageData.colorspace !== Colorspace.RGBA) throw new Error('Can only convolve RGBA')

  const matrix = ensureFlatMatrix(flatOrDeepMatrix)

  const srcPixels = imageData.data
  const dstPixels = new Uint8Array(imageData.data.length)

  const imageWidth = imageData.width
  const imageHeight = imageData.height

  const matrixWidth = Math.sqrt(matrix.length)
  const matrixHalfWidth = Math.floor(matrixWidth / 2)

  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < imageWidth; x++) {
      var r = 0
      var g = 0
      var b = 0
      var a = 0

      var totalWeight = 0
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

      var outputIndex = (y * imageWidth + x) * 4
      dstPixels[outputIndex] = ImageData.clip(Math.round(r / totalWeight))
      dstPixels[outputIndex + 1] = ImageData.clip(Math.round(g / totalWeight))
      dstPixels[outputIndex + 2] = ImageData.clip(Math.round(b / totalWeight))
      dstPixels[outputIndex + 3] = ImageData.clip(Math.round(a / totalWeight))
    }
  }

  return Object.assign({}, imageData, {data: dstPixels})
}
