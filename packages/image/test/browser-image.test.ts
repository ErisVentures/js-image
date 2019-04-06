import {runImageTests} from './shared-image.test'

import {ImageData, IAnnotatedImageData} from '../lib/image-data'
import {BrowserImage} from '../lib/browser-image'
import {fixtureDecode, testImage, enableWASM, disableWASM} from './utils'
import {Colorspace} from '../lib/types'

const testSkater = (...args) => testImage(BrowserImage, 'source-skater.jpg', ...args)

runImageTests(BrowserImage)

describe('WASM', () => {
  beforeAll(async () => {
    await enableWASM()
  })

  afterAll(async () => {
    await disableWASM()
  })

  it('should apply a calibration profile', async () => {
    const modify = img =>
      img.calibrate({
        redHueShift: -0.5,
        redSaturationShift: 0.5,
        greenHueShift: 0.5,
        greenSaturationShift: -0.5,
        blueHueShift: 0.5,
        blueSaturationShift: 0.5,
      })

    await testSkater('skater-calibrate.jpg', modify, {strict: false})
  })
})

describe('Performance', () => {
  let imageData
  function buildImageData({width, height}: {width: number; height: number}): IAnnotatedImageData {
    const data = new Uint8Array(width * height)
    for (let i = 0; i < data.length; i++) {
      data[i] = 0
    }

    return {width, height, channels: 1, colorspace: Colorspace.Greyscale, data}
  }

  beforeAll(async () => {
    await enableWASM()
    imageData = await fixtureDecode('source-yosemite.jpg')
  })

  afterAll(async () => {
    await disableWASM()
  })

  it('should not be hella slow merging layers', async () => {
    const layerA = buildImageData({width: 3000, height: 3000})
    const layerB = buildImageData({width: 3000, height: 3000})
    const layerC = buildImageData({width: 3000, height: 3000})
    const image = BrowserImage.from(ImageData.toRGBA(layerA)).layers([
      {imageData: layerB, opacity: 0.25},
      {imageData: layerC, opacity: 0.25},
    ])

    await image.toImageData()
  })

  it('should not be hella slow calibrating', async () => {
    const image = BrowserImage.from(imageData)
      .tone({
        contrast: 0.5,
        whites: 30,
        highlights: -20,
        midtones: 30,
        shadows: 50,
        blacks: -20,
      })
      .calibrate({
        redHueShift: -0.5,
        redSaturationShift: 0.5,
        greenHueShift: 0.5,
        greenSaturationShift: -0.5,
        blueHueShift: 0.5,
        blueSaturationShift: 0.5,
      })

    await image.toImageData()
  })

  it('should not be hella slow toning', async () => {
    const image = BrowserImage.from(imageData).tone({
      contrast: 0.5,
      whites: 30,
      highlights: -20,
      midtones: 30,
      shadows: 50,
      blacks: -20,
    })

    await image.toImageData()
  })
})
