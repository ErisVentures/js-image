import {Pixel, ICannyOptions} from '../types'
import {ImageData} from '../image-data'
import {sobel, SobelImageData, getPixelsForAngle} from './sobel'

const sumArray = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

function nonMaximalSuppresion(imageData: SobelImageData): SobelImageData {
  const dstPixels = new Uint8Array(imageData.data.length)

  var dstIndex = 0
  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
      if (ImageData.isBorder(imageData, x, y)) {
        dstPixels[dstIndex] = 0
        dstIndex++
        continue
      }

      var srcIndex = y * imageData.width + x
      const srcPixel = imageData.data[srcIndex]
      const pixels = getPixelsForAngle(imageData, x, y, imageData.angles[srcIndex])
      const isMaxima = pixels.every(pixel => pixel.value! <= srcPixel)

      if (isMaxima) {
        dstPixels[dstIndex] = srcPixel
      } else {
        dstPixels[dstIndex] = 0
      }

      dstIndex++
    }
  }

  return Object.assign({}, imageData, {data: new Uint8Array(dstPixels)})
}

function hysteresis(imageData: SobelImageData, options: ICannyOptions): SobelImageData {
  const dstPixels = new Uint8Array(imageData.data.length)

  const seen = new Set()
  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
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
      var foundStrongEdge = false
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

function autoThreshold(imageData: ImageData): number {
  const buckets = []
  for (var i = 0; i < 256; i++) {
    buckets[i] = 0
  }

  for (var i = 0; i < imageData.data.length; i++) {
    buckets[imageData.data[i]]++
  }

  var variance = -Infinity
  var threshold = 100
  const left = buckets.slice(0, 20)
  const right = buckets.slice(20)

  var leftSum = sumArray(left.map((x, i) => x * i))
  var rightSum = sumArray(right.map((x, i) => x * (i + 20)))
  var leftCount = sumArray(left)
  var rightCount = sumArray(right)
  for (var i = 20; i < 240; i++) {
    const bucketVal = buckets[i]
    leftSum += (bucketVal * i)
    rightSum -= (bucketVal * i)
    leftCount += bucketVal
    rightCount -= bucketVal

    const leftMean = leftSum / leftCount
    const rightMean = rightSum / rightCount
    const bucketVariance = Math.pow(leftMean - rightMean, 2) *
      (leftCount / imageData.data.length) *
      (rightCount / imageData.data.length)
    if (bucketVariance > variance) {
      variance = bucketVariance
      threshold = i
    }
  }

  return threshold
}

export function canny(
  origImageData: ImageData|SobelImageData,
  options?: ICannyOptions,
): SobelImageData {
  var sobelData: SobelImageData = origImageData as SobelImageData
  if (!sobelData.angles) {
    sobelData = sobel(origImageData)
  }

  if (!options) {
    const threshold = autoThreshold(sobelData)
    options = {lowThreshold: threshold / 2, highThreshold: threshold}
  }

  const suppressed = nonMaximalSuppresion(sobelData)
  return hysteresis(suppressed, options)
}
