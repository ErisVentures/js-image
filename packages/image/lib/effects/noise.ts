import {INoiseOptions, Colorspace} from '../types'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {createPRNG} from '../third-party/alea'

export function noise(width: number, height: number, options: INoiseOptions = {}): IAnnotatedImageData {
  const {seed = 'noise'} = options
  const prng = createPRNG(seed)

  const data = new Uint8Array(width * height)
  const imageData = {width, height, data, colorspace: Colorspace.Greyscale, channels: 1}
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      data[ImageData.indexFor(imageData, x, y)] = ImageData.clip(prng.next() * 255)
    }
  }

  return imageData
}
