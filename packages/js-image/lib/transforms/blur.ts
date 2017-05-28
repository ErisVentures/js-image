import {IBlurOptions} from '../types'
import {ImageData} from '../image-data'

export function boxBlur(imageData: ImageData, options: IBlurOptions): ImageData {
  const weight = Math.pow(options.radius * 2 + 1, 2)
  const outPixels = new Uint8Array(imageData.data.length)

  for (let i = 0; i < imageData.width; i++) {
    for (let j = 0; j < imageData.height; j++) {
      for (let channel = 0; channel < imageData.channels; channel++) {
        let value = 0
        for (let di = i - options.radius; di <= i + options.radius; di++) {
          for (let dj = j - options.radius; dj <= j + options.radius; dj++) {
            value += ImageData.valueFor(imageData, di, dj, channel)
          }
        }

        const index = ImageData.indexFor(imageData, i, j, channel)
        outPixels[index] = Math.round(value / weight)
      }
    }
  }

  return Object.assign({}, imageData, {data: outPixels})
}
