/* tslint:disable */
import {Pixel, ICannyOptions} from '../types'
import {ImageData} from '../image-data'
import {sobel, SobelImageData} from './sobel'

function sumArray(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function nonMaximalSuppresion(imageData: SobelImageData, radius?: number): SobelImageData {
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
      var srcPixel = imageData.data[srcIndex]
      var pixels = ImageData.getPixelsForAngle(imageData, x, y, imageData.angles[srcIndex], radius)
      var isMaxima = true
      for (var i = 0; i < pixels.length; i++) {
        if (pixels[i].value! > srcPixel) {
          isMaxima = false
          break
        }
      }

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
  const seen = new Uint8Array(imageData.data.length)

  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
      const srcIndex = y * imageData.width + x
      if (seen[srcIndex]) {
        continue
      }

      if (ImageData.isBorder(imageData, x, y)) {
        dstPixels[srcIndex] = 0
        continue
      }

      const srcPixel = imageData.data[srcIndex]
      if (srcPixel < options.lowThreshold!) {
        dstPixels[srcIndex] = 0
        continue
      }

      if (srcPixel >= options.highThreshold!) {
        dstPixels[srcIndex] = 255
        continue
      }

      const queue: Pixel[] = [{x, y, value: srcPixel, index: srcIndex}]
      const traversed: Set<number> = new Set()
      var foundStrongEdge = false
      while (queue.length) {
        const location = queue.shift()!
        traversed.add(location.index!)

        if (location.value! >= options.highThreshold!) {
          foundStrongEdge = true
          break
        }

        const edgeAngle = (imageData.angles[location.index!] + 90) % 180
        const pixels = ImageData.getPixelsForAngle(imageData, x, y, edgeAngle)
        pixels.forEach(pixel => {
          const index = pixel.index!
          if (traversed.has(index)) {
            return
          } else if (pixel.value! >= options.lowThreshold!) {
            queue.push(pixel)
          } else {
            dstPixels[index] = 0
            seen[index] = 1
          }
        })
      }

      queue.forEach(pixel => {
        dstPixels[pixel.index!] = 255
        seen[pixel.index!] = 1
      })

      for (const seenIndex of traversed) {
        dstPixels[seenIndex] = foundStrongEdge ? 255 : 0
        seen[seenIndex] = 1
      }
    }
  }

  return Object.assign({}, imageData, {data: dstPixels})
}

function autoThreshold(imageData: ImageData): number {
  var buckets = []
  for (var i = 0; i < 256; i++) {
    buckets[i] = 0
  }

  for (var i = 0; i < imageData.data.length; i++) {
    buckets[imageData.data[i]]++
  }

  var variance = -Infinity
  var threshold = 100
  var left = buckets.slice(0, 20)
  var right = buckets.slice(20)

  var leftSum = sumArray(left.map((x, i) => x * i))
  var rightSum = sumArray(right.map((x, i) => x * (i + 20)))
  var leftCount = sumArray(left)
  var rightCount = sumArray(right)
  for (var i = 20; i < 240; i++) {
    var bucketVal = buckets[i]
    leftSum += bucketVal * i
    rightSum -= bucketVal * i
    leftCount += bucketVal
    rightCount -= bucketVal

    var leftMean = leftSum / leftCount
    var rightMean = rightSum / rightCount
    var bucketVariance =
      Math.pow(leftMean - rightMean, 2) *
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
  origImageData: ImageData | SobelImageData,
  options?: ICannyOptions,
): SobelImageData {
  options = options || {}
  options.radius = options.radius || 1

  var sobelData: SobelImageData = origImageData as SobelImageData
  if (!sobelData.angles) {
    sobelData = sobel(origImageData, options)
  }

  if (!options.lowThreshold && !options.highThreshold) {
    const threshold = autoThreshold(sobelData)
    options.highThreshold = threshold
    options.lowThreshold = threshold / 2
  } else if (!options.lowThreshold) {
    options.lowThreshold = options.highThreshold! / 2
  } else if (!options.highThreshold) {
    options.highThreshold = options.lowThreshold * 2
  }

  const suppressed = nonMaximalSuppresion(sobelData, options.radius)
  return hysteresis(suppressed, options)
}
