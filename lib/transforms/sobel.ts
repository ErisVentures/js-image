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
  return getOffsetsForAngle(angle).map(offset => {
    /* tslint:disable */
    const x = srcX + offset.x
    const y = srcY + offset.y
    const index = y * imageData.width + x
    /* tslint:enable */
    return {x, y, index, value: imageData.data[index]}
  })
}

export interface SobelImageData extends ImageData {
  angles: number[]
}

export function sobel(origImageData: ImageData): SobelImageData {
  const xMatrix = [1, 0, -1, 2, 0, -2, 1, 0, -1]
  const yMatrix = [1, 2, 1, 0, 0, 0, -1, -2, -1]

  const imageData = ImageData.toGreyscale(origImageData)
  const srcPixels = imageData.data
  const dstPixels: number[] = []
  const dstAngles: number[] = []

  const imageWidth = imageData.width
  const imageHeight = imageData.height

  const matrixWidth = Math.sqrt(xMatrix.length)
  const matrixHalfWidth = Math.floor(matrixWidth / 2)

  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      let xVal = 0
      let yVal = 0
      if (x - matrixHalfWidth < 0 ||
          y - matrixHalfWidth < 0 ||
          x + matrixHalfWidth >= imageWidth ||
          y + matrixHalfWidth >= imageHeight) {
        dstPixels.push(0)
        dstAngles.push(0)
        continue
      }

      for (let matrixY = 0; matrixY < matrixWidth; matrixY++) {
        for (let matrixX = 0; matrixX < matrixWidth; matrixX++) {
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

      dstPixels.push(Math.round(Math.sqrt(xVal * xVal + yVal * yVal)))
      dstAngles.push(toNearestAngle(xVal, yVal))
    }
  }

  return Object.assign({}, imageData, {
    data: new Uint8Array(dstPixels),
    angles: dstAngles,
  })
}
