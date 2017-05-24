const jpeg = require('jpeg-js')
const canny = require('../../lib/transforms/canny').canny
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture, TIMEOUT} = require('../utils')

describe('#transforms/canny', () => {
  const imageData = ImageData.normalize(fixtureDecode('skater.jpg'))

  it('should find edges', function () {
    this.timeout(TIMEOUT)
    const output = canny(imageData)
    const jpegOutput = ImageData.toBuffer(output)
    compareToFixture(jpegOutput, 'skater-canny-auto.jpg')
  })

  it('should find edges with fixed threshold', function () {
    this.timeout(TIMEOUT)
    const output = canny(imageData, {lowThreshold: 75, highThreshold: 150})
    const jpegOutput = ImageData.toBuffer(output)
    compareToFixture(jpegOutput, 'skater-canny-fixed.jpg')
  })
})
