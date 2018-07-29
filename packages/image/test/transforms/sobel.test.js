const {sobel, generateWeightMatrix} = require('../../dist/transforms/sobel')
const ImageData = require('../../dist/image-data').ImageData
const {expect, fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/sobel', () => {
  const skaterPromise = fixtureDecode('source-skater.jpg').then(ImageData.normalize)

  describe('#generateWeightMatrix', () => {
    it('should generate a 5x5 y-matrix', () => {
      expect(generateWeightMatrix(2, false)).to.eql([
        1, 2, 4, 2, 1,
        2, 4, 8, 4, 2,
        0, 0, 0, 0, 0,
        -2, -4, -8, -4, -2,
        -1, -2, -4, -2, -1,
      ])
    })

    it('should generate a 5x5 x-matrix', () => {
      expect(generateWeightMatrix(2, true)).to.eql([
        1, 2, 0, -2, -1,
        2, 4, 0, -4, -2,
        4, 8, 0, -8, -4,
        2, 4, 0, -4, -2,
        1, 2, 0, -2, -1,
      ])
    })
  })

  it('should find edges', () => {
    return skaterPromise.then(skater => {
      const output = sobel(skater)
      const jpegOutput = ImageData.toBuffer(output)
      return compareToFixture(jpegOutput, 'skater-sobel.jpg')
    })
  })

  it('should find edges with radius', () => {
    return skaterPromise.then(imageData => {
      const output = sobel(imageData, {radius: 3})
      const jpegOutput = ImageData.toBuffer(output)
      return compareToFixture(jpegOutput, 'skater-sobel-radius-3.jpg')
    })
  })
})
