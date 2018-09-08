/* tslint:disable */
import {ImageData} from '../image-data'
import {MapPixelFn, IToneOptions} from '../types'

export function mapPixels(imageData: ImageData, fns: MapPixelFn | MapPixelFn[]): ImageData {
  if (!Array.isArray(fns)) fns = [fns]
  if (fns.length === 0) return imageData

  const {width, height, channels} = imageData
  var data = new Uint8Array(width * height * imageData.channels)
  var output = Object.assign({}, imageData, {width, height, data})

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var baseIndex = ImageData.indexFor(imageData, x, y)
      for (var c = 0; c < channels; c++) {
        var channel = ImageData.channelFor(imageData, c)
        var value: number = imageData.data[baseIndex + c]
        for (const fn of fns) {
          value = fn({x, y, value, channel})
        }

        data[baseIndex + c] = Math.min(Math.max(0, value), 255)
      }
    }
  }

  return output
}

export function contrast(options: IToneOptions): MapPixelFn {
  return pixel => {
    const delta = pixel.value! - 128
    return delta * options.contrast! + pixel.value!
  }
}

export function targetedBrightnessAdjustment(
  target: number,
  adjustment: number,
  range: number = 100,
): MapPixelFn {
  // Use Cosine function to determine how much to apply the adjustment
  // Remap the range (-R, R) to (-pi/2, pi/2)
  const cosine0 = Math.PI / 2

  return pixel => {
    const rawDistance = pixel.value! - target
    const cappedDistance = Math.min(range, Math.max(-range, rawDistance))
    const cosineDistance = (cappedDistance / range) * cosine0
    return Math.cos(cosineDistance) * adjustment + pixel.value!
  }
}

export function tone(imageData: ImageData, options: IToneOptions): ImageData {
  const fns: MapPixelFn[] = []

  if (options.contrast) fns.push(contrast(options))
  if (options.whites) fns.push(targetedBrightnessAdjustment(223, options.whites, 30))
  if (options.highlights) fns.push(targetedBrightnessAdjustment(192, options.highlights))
  if (options.midtones) fns.push(targetedBrightnessAdjustment(128, options.midtones))
  if (options.shadows) fns.push(targetedBrightnessAdjustment(64, options.shadows))
  if (options.blacks) fns.push(targetedBrightnessAdjustment(32, options.blacks, 30))

  return mapPixels(imageData, fns)
}
