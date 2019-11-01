import {Colorspace, INormalizeOptions} from '../types'
import {IAnnotatedImageData, ImageData} from '../image-data'

function findClipPoint(
  imageData: IAnnotatedImageData,
  samplePercentage: number,
  method: 'min' | 'max',
): number {
  const quickHist = []
  for (let i = 0; i < 256; i++) quickHist[i] = 0

  const numPixels = imageData.width * imageData.height
  for (let i = 0; i < numPixels; i++) {
    quickHist[imageData.data[i * imageData.channels]]++
  }

  let index = 0
  let cummulativeSum = 0
  while (cummulativeSum < samplePercentage) {
    const histValue = method === 'min' ? index : 255 - index
    cummulativeSum += quickHist[histValue] / numPixels
    index++
    if (index >= 255) break
  }

  return method === 'min' ? index : 255 - index
}

export function normalize(
  imageData: IAnnotatedImageData,
  options?: INormalizeOptions,
): IAnnotatedImageData {
  if (imageData.colorspace !== Colorspace.Greyscale && imageData.colorspace !== Colorspace.YCbCr) {
    imageData = ImageData.toColorspace(imageData, Colorspace.YCbCr)
  }

  const {
    strength = 1,
    blackPointPercentage = 0.02,
    whitePointPercentage = 0.02,
    midpointNormalization = 0,
  } = options || {}
  const blackPoint = findClipPoint(imageData, blackPointPercentage, 'min')
  const whitePoint = findClipPoint(imageData, whitePointPercentage, 'max')
  const greyPoint = findClipPoint(imageData, 0.5, 'min')
  const rawMultiplier = 255 / (whitePoint - blackPoint)
  const multiplier = 1 + (rawMultiplier - 1) * strength
  const adjustedMidpoint = multiplier * (greyPoint - blackPoint)
  const deltaForMidpointToReach128 = 128 - adjustedMidpoint

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const index = ImageData.indexFor(imageData, x, y)
      let pixel = imageData.data[index]

      // First we adjust the white and black point, i.e. the ends of the levels
      if (pixel <= blackPoint) pixel = 0
      else if (pixel >= whitePoint) pixel = 255
      else pixel = multiplier * (pixel - blackPoint)

      // Then we drag the middle of the curve closer to 128 without adjusting ends.
      // i.e. dragging the middle of the levels curve to the middle.
      if (midpointNormalization) {
        const distanceToMidpoint = Math.abs(adjustedMidpoint - pixel)
        const distanceFactor = (128 - distanceToMidpoint) / 128
        pixel += midpointNormalization * deltaForMidpointToReach128 * distanceFactor
      }

      imageData.data[index] = ImageData.clip255(pixel)
    }
  }

  return imageData
}
