import {IBlurOptions, BufferLike} from '../types'
import {ImageData} from '../image-data'

function boxBlur1D(
  firstMax: number,
  secondMax: number,
  channels: number,
  getIndex: (i: number, j: number, c: number) => number,
  srcPixels: BufferLike,
  radius: number,
): Uint8Array {
  const weight = radius * 2 + 1
  const outPixels = new Uint8Array(srcPixels.length)

  for (let i = 0; i < firstMax; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const firstValueIndex = getIndex(i, 0, channel)
      const lastValueIndex = getIndex(i, secondMax - 1, channel)
      const firstValue = srcPixels[firstValueIndex]
      const lastValue = srcPixels[lastValueIndex]

      let value = firstValue * (radius + 1)
      for (let j = 0; j < radius; j++) {
        const index = getIndex(i, j, channel)
        value += srcPixels[index]
      }

      for (let j = 0; j <= radius; j++) {
        const index = getIndex(i, j, channel)
        const nextIndex = getIndex(i, j + radius, channel)
        value += srcPixels[nextIndex] - firstValue
        outPixels[index] = value / weight
      }

      for (let j = radius + 1; j < secondMax - radius; j++) {
        const index = getIndex(i, j, channel)
        const nextIndex = getIndex(i, j + radius, channel)
        const falloffIndex = getIndex(i, j - radius - 1, channel)
        value += srcPixels[nextIndex] - srcPixels[falloffIndex]
        outPixels[index] = value / weight
      }

      for (let j = secondMax - radius; j < secondMax; j++) {
        const index = getIndex(i, j, channel)
        const falloffIndex = getIndex(i, j - radius, channel)
        value += lastValue - srcPixels[falloffIndex]
        outPixels[index] = value / weight
      }
    }
  }

  return outPixels
}

export function boxBlur(imageData: ImageData, options: IBlurOptions): ImageData {
  const intermediate = boxBlur1D(
    imageData.width,
    imageData.height,
    imageData.channels,
    (i: number, j: number, c: number) => ImageData.indexFor(imageData, i, j, c),
    imageData.data,
    options.radius,
  )

  const outPixels = boxBlur1D(
    imageData.height,
    imageData.width,
    imageData.channels,
    (j: number, i: number, c: number) => ImageData.indexFor(imageData, i, j, c),
    intermediate,
    options.radius,
  )

  for (let i = 0; i < outPixels.length; i++) {
    outPixels[i] = Math.round(outPixels[i])
  }

  return Object.assign({}, imageData, {data: outPixels})
}
