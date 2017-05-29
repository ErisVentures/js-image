const sobel = require('../../lib/transforms/sobel').sobel
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/sobel', () => {
  const skater = fixtureDecode('skater.jpg')

  it('should find edges', () => {
    const output = sobel(ImageData.normalize(skater))
    const jpegOutput = ImageData.toBuffer(output)
    compareToFixture(jpegOutput, 'skater-sobel.jpg')
  })
})
