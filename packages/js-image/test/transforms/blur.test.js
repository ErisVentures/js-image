const blur = require('../../lib/transforms/blur')
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/blur', () => {
  const skater = ImageData.normalize(fixtureDecode('skater.jpg'))

  it('should blur using box blur', () => {
    const output = blur.boxBlur(skater, {radius: 2})
    compareToFixture(ImageData.toBuffer(output), 'skater-box-blur.jpg')
  })
})
