/* tslint:disable */
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

  for (var i = 0; i < targetWidth; i++) {
    for (var j = 0; j < targetHeight; j++) {
      const origX = Math.floor(i * scaleFactor)
      const origY = Math.floor(j * scaleFactor)

      const origPos = (origY * imageData.width + origX) * imageData.channels
      var outPos = (j * targetWidth + i) * imageData.channels

      for (var channel = 0; channel < imageData.channels; channel++) {
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

  let targetWidth = options.width!
  let targetHeight = options.height!
  let scaleFactor = imageData.width / targetWidth
  const scaledHeight = Math.round(imageData.height / scaleFactor)
  if (targetHeight !== scaledHeight) {
    throw new Error('Can only resize exactly')
  }

  let boxResizeData: ImageData|null = null
  let boxResizeOptions: IResizeOptions|null = null
  if (scaleFactor >= 2) {
    const boxScaleFactor = Math.floor(scaleFactor)
    if (scaleFactor === boxScaleFactor) {
      return box(imageData, options)
    }

    targetWidth = targetWidth * boxScaleFactor
    targetHeight = targetHeight * boxScaleFactor
    scaleFactor = imageData.width / targetWidth

    boxResizeOptions = options
    boxResizeData = {
      width: targetWidth,
      height: targetHeight,
      data: imageData.data,
      channels: imageData.channels,
      format: imageData.format,
    }
  }

  let outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (var i = 0; i < targetWidth; i++) {
    for (var j = 0; j < targetHeight; j++) {
      const srcX = i * scaleFactor
      const srcY = j * scaleFactor

      var outPos = (j * targetWidth + i) * imageData.channels

      const srcXOffset = Math.floor(srcX)
      const srcYOffset = Math.floor(srcY) * imageData.width

      var srcPosA = (srcYOffset + srcXOffset) * imageData.channels
      var srcPosB = srcPosA + imageData.channels
      var srcPosC = (srcYOffset + imageData.width + srcXOffset) * imageData.channels
      var srcPosD = srcPosC + imageData.channels

      const xDistance = Math.abs(Math.floor(srcX) - srcX)
      const yDistance = Math.abs(Math.floor(srcY) - srcY)
      const weightPosA = Math.sqrt(xDistance * xDistance + yDistance * yDistance)
      const weightPosB = Math.sqrt((1 - xDistance) * (1 - xDistance) + yDistance * yDistance)
      const weightPosC = Math.sqrt(xDistance * xDistance + (1 - yDistance) * (1 - yDistance))
      const weightPosD = Math.sqrt(Math.pow(1 - xDistance, 2) + Math.pow(1 - yDistance, 2))
      const totalWeight = weightPosA + weightPosB + weightPosC + weightPosD

      for (var channel = 0; channel < imageData.channels; channel++) {
        const value = imageData.data[srcPosA + channel] * weightPosA / totalWeight +
          imageData.data[srcPosB + channel] * weightPosB / totalWeight +
          imageData.data[srcPosC + channel] * weightPosC / totalWeight +
          imageData.data[srcPosD + channel] * weightPosD / totalWeight
        outPixels[outPos + channel] = Math.round(value)
      }
    }
  }

  if (boxResizeData && boxResizeOptions) {
    boxResizeData!.data = outPixels
    targetWidth = boxResizeOptions!.width!
    targetHeight = boxResizeOptions!.height!
    outPixels = box(boxResizeData, boxResizeOptions).data as Uint8Array
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    format: imageData.format,
  }
}

export function box(imageData: ImageData, options: IResizeOptions): ImageData {
  if (!options.width || !options.height) {
    throw new Error('Missing width or height')
  }

  const targetWidth = options.width!
  const targetHeight = options.height!
  const scaleFactor = imageData.width / targetWidth
  if (scaleFactor <= 1) {
    throw new Error('Box resize can only shrink images')
  } else if (targetHeight !== imageData.height / scaleFactor ||
      Math.floor(scaleFactor) !== scaleFactor) {
    throw new Error('Can only resize exactly')
  }

  const outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (let i = 0; i < targetWidth; i++) {
    for (let j = 0; j < targetHeight; j++) {
      const origX = Math.floor(i * scaleFactor)
      const origY = Math.floor(j * scaleFactor)

      const outPos = (j * targetWidth + i) * imageData.channels

      for (let channel = 0; channel < imageData.channels; channel++) {
        let value = 0
        for (let dx = 0; dx < scaleFactor; dx++) {
          for (let dy = 0; dy < scaleFactor; dy++) {
            const origPos = ((origY + dy) * imageData.width + (origX + dx)) * imageData.channels
            value += imageData.data[origPos + channel]
          }
        }

        outPixels[outPos + channel] = value / (scaleFactor * scaleFactor)
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
