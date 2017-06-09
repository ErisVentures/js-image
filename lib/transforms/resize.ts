import {IResizeOptions} from '../types'
import {ImageData} from '../image-data'

export function nearestNeighbor(imageData: ImageData, options: IResizeOptions): ImageData {
  if (!options.width || !options.height) {
    throw new Error('Missing width or height')
  }

  const targetWidth = options.width!
  const targetHeight = options.height!
  const scaleFactor = imageData.width / targetWidth
  const scaledHeight = Math.round(imageData.height / scaleFactor)
  if (targetHeight !== scaledHeight) {
    throw new Error('Can only resize exactly')
  }

  const outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (let i = 0; i < targetWidth; i++) {
    for (let j = 0; j < targetHeight; j++) {
      const origX = Math.floor(i * scaleFactor)
      const origY = Math.floor(j * scaleFactor)

      const origPos = (origY * imageData.width + origX) * imageData.channels
      const outPos = (j * targetWidth + i) * imageData.channels

      for (let channel = 0; channel < imageData.channels; channel++) {
        outPixels[outPos + channel] = imageData.data[origPos + channel]
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    format: imageData.format,
  }
}

export function bilinear(imageData: ImageData, options: IResizeOptions): ImageData {
  if (!options.width || !options.height) {
    throw new Error('Missing width or height')
  }

  const targetWidth = options.width!
  const targetHeight = options.height!
  const scaleFactor = imageData.width / targetWidth
  const scaledHeight = Math.round(imageData.height / scaleFactor)
  if (targetHeight !== scaledHeight) {
    throw new Error('Can only resize exactly')
  }

  const outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (let i = 0; i < targetWidth; i++) {
    for (let j = 0; j < targetHeight; j++) {
      const srcX = i * scaleFactor
      const srcY = j * scaleFactor

      const outPos = (j * targetWidth + i) * imageData.channels

      const srcXOffset = Math.floor(srcX)
      const srcYOffset = Math.floor(srcY) * imageData.width

      const srcPosA = (srcYOffset + srcXOffset) * imageData.channels
      const srcPosB = srcPosA + imageData.channels
      const srcPosC = (srcYOffset + imageData.width + srcXOffset) * imageData.channels
      const srcPosD = srcPosC + imageData.channels

      const xDistance = Math.abs(Math.floor(srcX) - srcX)
      const yDistance = Math.abs(Math.floor(srcY) - srcY)
      const weightPosA = Math.sqrt(xDistance * xDistance + yDistance * yDistance)
      const weightPosB = Math.sqrt((1 - xDistance) * (1 - xDistance) + yDistance * yDistance)
      const weightPosC = Math.sqrt(xDistance * xDistance + (1 - yDistance) * (1 - yDistance))
      const weightPosD = Math.sqrt(Math.pow(1 - xDistance, 2) + Math.pow(1 - yDistance, 2))
      const totalWeight = weightPosA + weightPosB + weightPosC + weightPosD

      for (let channel = 0; channel < imageData.channels; channel++) {
        const value = imageData.data[srcPosA + channel] * weightPosA / totalWeight +
          imageData.data[srcPosB + channel] * weightPosB / totalWeight +
          imageData.data[srcPosC + channel] * weightPosC / totalWeight +
          imageData.data[srcPosD + channel] * weightPosD / totalWeight
        outPixels[outPos + channel] = Math.round(value)
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    format: imageData.format,
  }
}
