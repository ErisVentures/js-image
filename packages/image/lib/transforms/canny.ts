/* tslint:disable */
import {Pixel, ICannyOptions} from '../types'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {sobel, SobelImageData} from './sobel'

function sumArray(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

/**
 * Non-maximal supression is "edge thinning".
 * It finds the local contrast maxima and, in a sobel image, sets all other weaker values to black.
 *
 * @param imageData
 * @param radius
 */
function nonMaximalSuppresion(imageData: SobelImageData, radius?: number): SobelImageData {
  const dstPixels = new Uint8Array(imageData.data.length)

  var dstIndex = 0
  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
      // Ignore all borders
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

/**
 * Hysteresis is "edge removal"
 * Strong edges are edges with an intensity above highThreshold.
 * Weak edges are edges with an intensity above lowThreshold.
 *
 * Strong edges are kept, and weak edges *that connect strong edges* are kept.
 *
 * @param imageData
 * @param options
 */
function hysteresis(imageData: SobelImageData, options: ICannyOptions): SobelImageData {
  const dstPixels = new Uint8Array(imageData.data.length)
  const seen = new Uint8Array(imageData.data.length)

  for (var y = 0; y < imageData.height; y++) {
    for (var x = 0; x < imageData.width; x++) {
      const srcIndex = y * imageData.width + x
      // We've already traced this pixel's edge, skip it
      if (seen[srcIndex]) {
        continue
      }

      // Ignore all borders
      if (ImageData.isBorder(imageData, x, y)) {
        dstPixels[srcIndex] = 0
        continue
      }

      const srcPixel = imageData.data[srcIndex]
      // If the pixel is not even a weak edge, we can skip it
      if (srcPixel < options.lowThreshold!) {
        dstPixels[srcIndex] = 0
        continue
      }

      // If the pixel is already a strong edge, we can skip it
      if (srcPixel >= options.highThreshold!) {
        dstPixels[srcIndex] = 255
        continue
      }

      // We're now in a weak edge situation, we need to traverse this entire edge
      // until we reach the end or we find a strong edge it's connected to.
      const queue: Pixel[] = [{x, y, value: srcPixel, index: srcIndex}]
      const traversed: Set<number> = new Set()
      var foundStrongEdge = false
      while (queue.length) {
        const location = queue.shift()!
        traversed.add(location.index!)

        // We found our strong edge, we can stop
        if (location.value! >= options.highThreshold!) {
          foundStrongEdge = true
          break
        }

        // Get the edge angle and queue up the neighboring pixels
        const edgeAngle = (imageData.angles[location.index!] + 90) % 180
        const pixels = ImageData.getPixelsForAngle(imageData, x, y, edgeAngle)
        pixels.forEach(pixel => {
          const index = pixel.index!
          if (traversed.has(index)) {
            // We already looked at this pixel, don't add it to the queue again
            return
          } else if (pixel.value! >= options.lowThreshold!) {
            // We found another edge pixel, queue it up for inspection
            queue.push(pixel)
          } else {
            // We reached the end of the edge, nothing more to queue
            dstPixels[index] = 0
            seen[index] = 1
          }
        })
      }

      // Everything left in the queue must be a strong edge too, the queue would be empty if it were weak
      for (const pixel of queue) {
        dstPixels[pixel.index!] = 255
        seen[pixel.index!] = 1
      }

      // Update everything we saw with the result of the strong edge search
      for (const seenIndex of traversed) {
        dstPixels[seenIndex] = foundStrongEdge ? 255 : 0
        seen[seenIndex] = 1
      }
    }
  }

  return Object.assign({}, imageData, {data: dstPixels})
}

function autoThreshold(imageData: IAnnotatedImageData): number {
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

/**
 * Performs Canny edge detection on the image data.
 * If a sobel filter has not already been run, this function will run sobel as well.
 *
 * @see https://en.wikipedia.org/wiki/Canny_edge_detector
 * @param imageData
 * @param options
 */
export function canny(
  imageData: IAnnotatedImageData | SobelImageData,
  options?: ICannyOptions,
): SobelImageData {
  options = options || {}
  options.radius = options.radius || 1

  var sobelImageData: SobelImageData = imageData as SobelImageData
  if (!sobelImageData.angles) {
    sobelImageData = sobel(imageData, options)
  }

  if (!options.lowThreshold && !options.highThreshold) {
    const threshold = autoThreshold(sobelImageData)
    options.highThreshold = threshold
    options.lowThreshold = threshold / 2
  } else if (!options.lowThreshold) {
    options.lowThreshold = options.highThreshold! / 2
  } else if (!options.highThreshold) {
    options.highThreshold = options.lowThreshold * 2
  }

  const suppressed = nonMaximalSuppresion(sobelImageData, options.radius)
  return hysteresis(suppressed, options)
}
