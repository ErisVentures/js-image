const sobel = require('../../lib/transforms/sobel').sobel
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/sobel', () => {
  const skaterPromise = fixtureDecode('skater.jpg').then(ImageData.normalize)

  it('should find edges', () => {
    return skaterPromise.then(skater => {
      const output = sobel(skater)
      const jpegOutput = ImageData.toBuffer(output)
      return compareToFixture(jpegOutput, 'skater-sobel.jpg')
    })
  })
})
