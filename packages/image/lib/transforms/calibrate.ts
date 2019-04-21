/* tslint:disable */
import {IAnnotatedImageData, ImageData} from '../image-data'
import {ICalibrationOptions, ICalibrationProfile, Colorspace, ColorChannel} from '../types'

function toXYZ(hue: number, saturation: number, lightness: number): number[] {
  const imageData: IAnnotatedImageData = {
    width: 1,
    height: 1,
    channels: 3,
    colorspace: Colorspace.HSL,
    data: [(hue / 360) * 255, saturation * 255, lightness * 255],
  }

  return ImageData.toXYZ(imageData).data as number[]
}

function getCalibrationProfile(options: ICalibrationOptions): ICalibrationProfile {
  const {redHueShift = 0, greenHueShift = 0, blueHueShift = 0} = options

  const [xRed, yRed, zRed] = toXYZ((360 + redHueShift * 45) % 360, 1, 0.5)
  const [xGreen, yGreen, zGreen] = toXYZ(120 + greenHueShift * 45, 1, 0.5)
  const [xBlue, yBlue, zBlue] = toXYZ(240 + blueHueShift * 45, 1, 0.5)

  return {
    xRed,
    yRed,
    zRed,
    xGreen,
    yGreen,
    zGreen,
    xBlue,
    yBlue,
    zBlue,
  }
}

function saturate(
  imageData: IAnnotatedImageData,
  intensity: number,
  channel: ColorChannel,
): IAnnotatedImageData {
  const channelIndex = ImageData.channelsFor(imageData.colorspace).indexOf(channel)

  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const offset = ImageData.indexFor(imageData, x, y)
      const primaryValue = imageData.data[offset + channelIndex]

      for (let c = 0; c < imageData.channels; c++) {
        if (c === channelIndex) continue
        const secondaryValue = imageData.data[offset + c]
        const diffToPrimary = Math.max(primaryValue - secondaryValue, 0)
        imageData.data[offset + c] = ImageData.clip255(secondaryValue - diffToPrimary * intensity)
      }
    }
  }

  return imageData
}

function desaturate(
  imageData: IAnnotatedImageData,
  intensity: number,
  targetChannel: ColorChannel,
): IAnnotatedImageData {
  const channels = ImageData.channelsFor(imageData.colorspace)
  const channelIndex = channels.indexOf(targetChannel)
  // Green desaturates most, then blue, then red, red ends up desaturating everything later
  const intensityByChannel = [0.5, 0.7, 0.6]

  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const offset = ImageData.indexFor(imageData, x, y)
      const primaryValue = imageData.data[offset + channelIndex]

      for (let c = 0; c < imageData.channels; c++) {
        if (c === channelIndex) continue
        const secondaryValue = imageData.data[offset + c]
        const diffToPrimary = Math.max(primaryValue - secondaryValue, 0)
        const multiplier = intensity * intensityByChannel[channelIndex]
        imageData.data[offset + c] = ImageData.clip255(secondaryValue + diffToPrimary * multiplier)
      }

      let r = imageData.data[offset + 0]
      let g = imageData.data[offset + 1]
      let b = imageData.data[offset + 2]

      const saturationIntensity = (Math.max(r, g, b) - Math.min(r, g, b)) / 255

      if (targetChannel === ColorChannel.Red) {
        // Desaturate blue and green too
        const gr = Math.max(g - r, 0) * 1.5
        const gb = Math.max(g - b, 0) * 1.5
        const br = Math.max(b - r, 0) * 0.75
        const bg = Math.max(b - g, 0) * 0.75
        r += Math.max(gr, br) * intensity * 0.3
        g += bg * intensity * 0.3
        b += gb * intensity * 0.3
      } else if (targetChannel === ColorChannel.Green) {
        // Desaturate red a little more
        const rg = Math.max(r - g, 0)
        const rb = Math.max(r - b, 0)
        g += rg * intensity * 0.2
        b += rb * intensity * 0.2
      } else if (targetChannel === ColorChannel.Blue) {
        // Step 2, bring green up for red and red up for green slightly
        const rgTradeoff = Math.abs(r - g) * 0.05 * saturationIntensity
        if (r > g) {
          r -= rgTradeoff * 3
          g += rgTradeoff
        } else {
          r += rgTradeoff * 6
          g -= rgTradeoff * 2
        }
      }

      // Clip the color intensities based on how saturated they are
      // i.e. 255,0,0 -> 230,0,0 BUT 255,255,255 -> 255,255,255
      r *= 1 - saturationIntensity * 0.12
      g *= 1 - saturationIntensity * 0.12
      b *= 1 - saturationIntensity * 0.12

      imageData.data[offset + 0] = ImageData.clip255(r)
      imageData.data[offset + 1] = ImageData.clip255(g)
      imageData.data[offset + 2] = ImageData.clip255(b)
    }
  }

  return imageData
}

export function calibrate(
  imageData: IAnnotatedImageData,
  options: ICalibrationOptions,
): IAnnotatedImageData {
  const {colorspace} = imageData

  if (options.redHueShift || options.greenHueShift || options.blueHueShift) {
    // Hue transforms are conversion to XYZ colorspace using the RGB values of the hue shifted primaries
    const profile = getCalibrationProfile(options)
    imageData = ImageData.toXYZ(imageData, profile)
    imageData = ImageData.toRGB(imageData)
  }

  imageData = ImageData.toRGB(imageData)

  const {Red, Green, Blue} = ColorChannel
  const {redSaturationShift = 0, greenSaturationShift = 0, blueSaturationShift = 0} = options

  if (redSaturationShift > 0) imageData = saturate(imageData, redSaturationShift, Red)
  if (greenSaturationShift > 0) imageData = saturate(imageData, greenSaturationShift, Green)
  if (blueSaturationShift > 0) imageData = saturate(imageData, blueSaturationShift, Blue)
  if (redSaturationShift < 0) imageData = desaturate(imageData, -redSaturationShift, Red)
  if (greenSaturationShift < 0) imageData = desaturate(imageData, -greenSaturationShift, Green)
  if (blueSaturationShift < 0) imageData = desaturate(imageData, -blueSaturationShift, Blue)

  return ImageData.toColorspace(imageData, colorspace)
}
