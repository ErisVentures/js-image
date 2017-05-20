import {ImageData, Pixel} from '../image-data'
import {sobel, SobelImageData, getPixelsForAngle} from './sobel'

export interface ICannyOptions {
  highThreshold: number,
  lowThreshold: number,
}

function nonMaximalSuppresion(imageData: SobelImageData): SobelImageData {
  const dstPixels: number[] = []

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      if (ImageData.isBorder(imageData, x, y)) {
        dstPixels.push(0)
        continue
      }

      const srcIndex = y * imageData.width + x
      const srcPixel = imageData.data[srcIndex]
      const pixels = getPixelsForAngle(imageData, x, y, imageData.angles[srcIndex])
      const isMaxima = pixels.every(pixel => pixel.value! <= srcPixel)

      if (isMaxima) {
        dstPixels.push(srcPixel)
      } else {
        dstPixels.push(0)
      }
    }
  }

  return Object.assign({}, imageData, {data: new Uint8Array(dstPixels)})
}

function hysteresis(imageData: SobelImageData, options: ICannyOptions): SobelImageData {
  const dstPixels = new Uint8Array(imageData.data.length)

  const seen = new Set()
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIndex = y * imageData.width + x
      if (seen.has(srcIndex)) {
        continue
      }

      if (ImageData.isBorder(imageData, x, y)) {
        dstPixels[srcIndex] = 0
        continue
      }

      const srcPixel = imageData.data[srcIndex]
      if (srcPixel < options.lowThreshold) {
        dstPixels[srcIndex] = 0
        continue
      }

      if (srcPixel >= options.highThreshold) {
        dstPixels[srcIndex] = 255
        continue
      }

      const queue: Pixel[] = [{x, y, value: srcPixel, index: srcIndex}]
      const traversed: Set<number> = new Set()
      let foundStrongEdge = false
      while (queue.length) {
        const location = queue.shift()!
        traversed.add(location.index!)

        if (location.value! >= options.highThreshold) {
          foundStrongEdge = true
          break
        }

        const edgeAngle = (imageData.angles[location.index!] + 90) % 180
        const pixels = getPixelsForAngle(imageData, x, y, edgeAngle)
        pixels.forEach(pixel => {
          const index = pixel.index!
          if (traversed.has(index)) {
            return
          } else if (pixel.value! >= options.lowThreshold) {
            queue.push(pixel)
          } else {
            dstPixels[index] = 0
            seen.add(index)
          }
        })
      }

      queue.forEach(pixel => {
        dstPixels[pixel.index!] = 255
        seen.add(pixel.index!)
      })

      for (const seenIndex of traversed) {
        dstPixels[seenIndex] = foundStrongEdge ? 255 : 0
        seen.add(seenIndex)
      }
    }
  }

  return Object.assign({}, imageData, {data: dstPixels})
}

export function canny(
  origImageData: ImageData|SobelImageData,
  options?: ICannyOptions,
): SobelImageData {
  let sobelData: SobelImageData = origImageData as SobelImageData
  if (!sobelData.angles) {
    sobelData = sobel(origImageData)
  }

  const suppressed = nonMaximalSuppresion(sobelData)
  return hysteresis(suppressed, options || {lowThreshold: 40, highThreshold: 100})
}
