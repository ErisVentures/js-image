const jpeg = require('jpeg-js')
const sobel = require('../../lib/transforms/sobel').sobel
const ImageData = require('../../lib/image-data').ImageData
const {expect, fixture, compareToFixture, TIMEOUT} = require('../utils')

const toPixels = arrs => new Uint8Array(arrs.reduce((acc, arr) => acc.concat(arr), []))

describe('#transforms/sobel', () => {
  const skater = fixture('skater.jpg')

  it('should find edges', function () {
    this.timeout(TIMEOUT)
    const output = sobel(ImageData.normalize(jpeg.decode(skater)))
    const jpegOutput = jpeg.encode(ImageData.toRGBA(output), 90)
    compareToFixture(jpegOutput.data, 'skater-sobel.jpg')
  })
})
