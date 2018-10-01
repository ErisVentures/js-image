/* tslint:disable */
import {IAnnotatedImageData, ImageData, defaultCalibrationProfile} from '../image-data'
import {
  ICalibrationOptions,
  MapPixelFn,
  IPixel,
  ICalibrationProfile,
  Colorspace,
  ColorChannel,
} from '../types'

function toXYZ(hue: number, saturation: number, lightness: number): number[] {
  const imageData: IAnnotatedImageData = {
    width: 1,
    height: 1,
    channels: 3,
    colorspace: Colorspace.HSL,
    data: [hue, saturation, lightness],
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

function targetedSaturationShift(targetHue: number, range: number, shift: number): MapPixelFn {
  return ImageData.proximityTransform(
    [ColorChannel.Hue, ColorChannel.Saturation, ColorChannel.Lightness],
    [targetHue, 1, 0.5],
    [range, 1, 0.5],
    ColorChannel.Saturation,
    shift,
  )
}

function targetedLightnessShift(targetHue: number, range: number, shift: number): MapPixelFn {
  return ImageData.proximityTransform(
    [ColorChannel.Hue, ColorChannel.Saturation, ColorChannel.Lightness],
    [targetHue, 1, 0.5],
    [range, 1, 0.5],
    ColorChannel.Lightness,
    shift,
  )
}

function handleRedSaturationShift(options: ICalibrationOptions): MapPixelFn[] {
  const intensity = options.redSaturationShift
  if (!intensity) return []

  let lumaAdjustments: MapPixelFn[] = []
  if (intensity < 0) {
    lumaAdjustments = [
      targetedLightnessShift(360, 10e6, -0.15 * intensity),
      targetedLightnessShift(45, 45, -0.2 * intensity),
    ]
  }

  return [
    ...lumaAdjustments,
    targetedSaturationShift(360, 10e6, 0.25 * intensity),
    targetedSaturationShift(360, 45, 0.4 * intensity),
  ]
}

function handleGreenSaturationShift(options: ICalibrationOptions): MapPixelFn[] {
  const intensity = options.greenSaturationShift
  if (!intensity) return []

  let lumaAdjustments: MapPixelFn[] = []
  if (intensity < 0) {
    lumaAdjustments = [
      targetedLightnessShift(60, 60, -0.2 * intensity),
      targetedLightnessShift(90, 60, -0.3 * intensity),
      targetedLightnessShift(120, 60, -0.3 * intensity),
      targetedLightnessShift(150, 60, -0.3 * intensity),
    ]
  }

  return [
    ...lumaAdjustments,
    targetedSaturationShift(120, 10e6, 0.3 * intensity),
    targetedSaturationShift(120, 90, 0.3 * intensity),
  ]
}

function handleBlueSaturationShift(options: ICalibrationOptions): MapPixelFn[] {
  const intensity = options.blueSaturationShift
  if (!intensity) return []

  let lumaAdjustments: MapPixelFn[] = []
  if (intensity < 0) {
    lumaAdjustments = [
      targetedLightnessShift(180, 60, -0.2 * intensity),
      targetedLightnessShift(210, 60, -0.3 * intensity),
      targetedLightnessShift(240, 60, -0.3 * intensity),
      targetedLightnessShift(270, 60, -0.3 * intensity),
      targetedLightnessShift(300, 60, -0.3 * intensity),
    ]
  }

  return [
    ...lumaAdjustments,
    targetedSaturationShift(240, 10e6, 0.3 * intensity),
    targetedSaturationShift(240, 90, 0.3 * intensity),
  ]
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

  if (options.redSaturationShift || options.greenSaturationShift || options.blueSaturationShift) {
    // Saturation transforms are just a series of HSL saturation and lightness transforms
    imageData = ImageData.toHSL(imageData)

    const fns = [
      ...handleRedSaturationShift(options),
      ...handleGreenSaturationShift(options),
      ...handleBlueSaturationShift(options),
    ]

    imageData = ImageData.mapPixels(imageData, fns)
  }

  return ImageData.toColorspace(imageData, colorspace)
}
