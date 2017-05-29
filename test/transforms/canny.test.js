const canny = require('../../lib/transforms/canny').canny
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/canny', () => {
  const imageData = ImageData.normalize(fixtureDecode('skater.jpg'))

  it('should find edges', () => {
    const output = canny(imageData)
    const jpegOutput = ImageData.toBuffer(output)
    compareToFixture(jpegOutput, 'skater-canny-auto.jpg')
  })

  it('should find edges with fixed threshold', () => {
    const output = canny(imageData, {lowThreshold: 75, highThreshold: 150})
    const jpegOutput = ImageData.toBuffer(output)
    compareToFixture(jpegOutput, 'skater-canny-fixed.jpg')
  })
})
