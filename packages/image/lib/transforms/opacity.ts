import {IAnnotatedImageData, ImageData} from '../image-data'

export function opacity(
  background: IAnnotatedImageData,
  foreground: IAnnotatedImageData,
  opacity: number,
): IAnnotatedImageData {
  if (background.colorspace !== foreground.colorspace) throw new Error('Colorspaces must match')
  if (background.data.length !== foreground.data.length) throw new Error('Sizes must match')
  if (!(background.data instanceof Uint8Array)) throw new Error('Must be Uint8Array')

  const alphaForeground = opacity
  const alphaBackground = 1 - opacity
  // TODO: take alpha channel into account
  const newData = new Uint8Array(background.data.length)
  for (let i = 0; i < background.data.length; i++) {
    newData[i] = ImageData.clip(
      background.data[i] * alphaBackground + foreground.data[i] * alphaForeground,
    )
  }

  return {...background, data: newData}
}
