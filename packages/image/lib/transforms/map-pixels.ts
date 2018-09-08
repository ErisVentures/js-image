/* tslint:disable */
import {ImageData} from '../image-data'
import {MapPixelFn} from '../types'

export function mapPixels(imageData: ImageData, fns: MapPixelFn | MapPixelFn[]): ImageData {
  if (!Array.isArray(fns)) fns = [fns]

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

        data[baseIndex + c] = value
      }
    }
  }

  return output
}
