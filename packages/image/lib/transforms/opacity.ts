import {IAnnotatedImageData, ImageData} from '../image-data'
import {Colorspace} from '../types'

export function opacity(
  background: IAnnotatedImageData,
  foreground: IAnnotatedImageData,
  opacity: number,
): IAnnotatedImageData {
  const isUint8 =
    background.data instanceof Uint8Array || background.data instanceof Uint8ClampedArray
  if (background.colorspace !== foreground.colorspace) throw new Error('Colorspaces must match')
  if (background.data.length !== foreground.data.length) throw new Error('Sizes must match')
  if (!isUint8) throw new Error('Must be Uint8Array')

  const newData = new Uint8Array(background.data.length)
  if (background.colorspace === Colorspace.RGBA) {
    for (let x = 0; x < background.width; x++) {
      for (let y = 0; y < background.height; y++) {
        const index = ImageData.indexFor(background, x, y)
        const opacityForegroundSrc = foreground.data[index + 3] / 255
        const opacityForeground = opacity * opacityForegroundSrc
        const opacityBackground = background.data[index + 3] / 255
        if (opacityBackground !== 1) throw new Error('Cannot handle transparent backgrounds')

        const foregroundMultiplier = opacityForeground
        const backgroundMultiplier = 1 - opacityForeground

        newData[index] = Math.round(
          background.data[index] * backgroundMultiplier +
            foreground.data[index] * foregroundMultiplier,
        )
        newData[index + 1] = Math.round(
          background.data[index + 1] * backgroundMultiplier +
            foreground.data[index + 1] * foregroundMultiplier,
        )
        newData[index + 2] = Math.round(
          background.data[index + 2] * backgroundMultiplier +
            foreground.data[index + 2] * foregroundMultiplier,
        )
        newData[index + 3] = 255
      }
    }
  } else {
    const foregroundMultiplier = opacity
    const backgroundMultiplier = 1 - opacity

    for (let i = 0; i < background.data.length; i++) {
      // Assuming the input data is clipped, there's no need to clip here either
      newData[i] = Math.round(
        background.data[i] * backgroundMultiplier + foreground.data[i] * foregroundMultiplier,
      )
    }
  }

  return {...background, data: newData}
}
