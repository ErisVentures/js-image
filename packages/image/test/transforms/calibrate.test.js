const calibrate = require('../../dist/transforms/calibrate').calibrate
const ImageData = require('../../dist/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/calibrate', () => {
  const rainbowPromise = fixtureDecode('source-rainbow.jpg').then(ImageData.normalize)

  const tests = [
    ['red-hue-plus', {redHueShift: 1}],
    ['red-hue', {redHueShift: -1}],
    ['red-saturation-plus', {redSaturationShift: 1}],
    ['red-saturation', {redSaturationShift: -1}],
    ['green-hue-plus', {greenHueShift: 1}],
    ['green-hue', {greenHueShift: -1}],
    ['green-saturation-plus', {greenSaturationShift: 1}],
    ['green-saturation', {greenSaturationShift: -1}],
    ['blue-hue-plus', {blueHueShift: 1}],
    ['blue-hue', {blueHueShift: -1}],
    ['blue-saturation-plus', {blueSaturationShift: 1}],
    ['blue-saturation', {blueSaturationShift: -1}],
  ]

  for (const [testName, options] of tests) {
    it(`should ${testName}`, async () => {
      const rainbowData = await rainbowPromise
      const output = calibrate(rainbowData, options)
      const fileName = `rainbow-calibrate-${testName}.jpg`
      await compareToFixture(ImageData.toBuffer(output), fileName, {strict: false})
    })
  }
})
