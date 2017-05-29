const blur = require('../../lib/transforms/blur')
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/blur', () => {
  const skater = ImageData.normalize(fixtureDecode('skater.jpg'))

  it('should blur using box blur', () => {
    const output = blur.boxBlur(skater, {radius: 2})
    compareToFixture(ImageData.toBuffer(output), 'skater-box-blur.jpg', {
      strict: false,
      tolerance: 2,
    })
  })

  it('should blur using gaussian blur', () => {
    const output = blur.gaussianBlur(skater, {sigma: 2, approximate: false})
    compareToFixture(ImageData.toBuffer(output), 'skater-gaussian-blur.jpg', {
      strict: false,
      tolerance: 2,
    })
  })

  it('should blur using approximated gaussian blur', () => {
    const output = blur.gaussianBlur(skater, {sigma: 2, approximate: true})
    compareToFixture(ImageData.toBuffer(output), 'skater-gaussian-blur-approx.jpg', {
      strict: false,
      tolerance: 2,
    })
  })
})
