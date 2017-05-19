const jpeg = require('jpeg-js')
const canny = require('../../lib/transforms/canny').canny
const ImageData = require('../../lib/image-data').ImageData
const {expect, fixtureDecode, compareToFixture, TIMEOUT} = require('../utils')

describe('#transforms/canny', () => {
  const skater =

  it('should find edges', function () {
    this.timeout(TIMEOUT * 10)
    const output = canny(ImageData.normalize(fixtureDecode('skater.jpg')))
    const jpegOutput = jpeg.encode(ImageData.toRGBA(output), 90)
    compareToFixture(jpegOutput.data, 'skater-canny.jpg')
  })
})
