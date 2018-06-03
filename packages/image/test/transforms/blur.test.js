const blur = require('../../lib/transforms/blur')
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/blur', () => {
  const skaterPromise = fixtureDecode('source-skater.jpg').then(ImageData.normalize)

  it('should blur using box blur', () => {
    return skaterPromise.then(skater => {
      const output = blur.boxBlur(skater, {radius: 2})
      return compareToFixture(ImageData.toBuffer(output), 'skater-box-blur.jpg', {
        strict: false,
        tolerance: 3,
      })
    })
  })

  it('should blur using gaussian blur', () => {
    return skaterPromise.then(skater => {
      const output = blur.gaussianBlur(skater, {sigma: 2, approximate: false})
      return compareToFixture(ImageData.toBuffer(output), 'skater-gaussian-blur.jpg', {
        strict: false,
        tolerance: 2,
      })
    })
  })

  it('should blur using approximated gaussian blur', () => {
    return skaterPromise.then(skater => {
      const output = blur.gaussianBlur(skater, {sigma: 2, approximate: true})
      return compareToFixture(ImageData.toBuffer(output), 'skater-gaussian-blur-approx.jpg', {
        strict: false,
        tolerance: 2,
      })
    })
  })
})
