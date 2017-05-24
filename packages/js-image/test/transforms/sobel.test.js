const jpeg = require('jpeg-js')
const sobel = require('../../lib/transforms/sobel').sobel
const ImageData = require('../../lib/image-data').ImageData
const {expect, fixtureDecode, compareToFixture, TIMEOUT} = require('../utils')

const toPixels = arrs => new Uint8Array(arrs.reduce((acc, arr) => acc.concat(arr), []))

describe('#transforms/sobel', () => {
  const skater = fixtureDecode('skater.jpg')

  it('should find edges', function () {
    this.timeout(TIMEOUT)
    const output = sobel(ImageData.normalize(skater))
    const jpegOutput = ImageData.toBuffer(output)
    compareToFixture(jpegOutput, 'skater-sobel.jpg')
  })
})
