const resize = require('../../lib/transforms/resize')
const ImageData = require('../../lib/image-data').ImageData
const {expect, fixtureDecode, compareToFixture, TIMEOUT} = require('../utils')

const toPixels = arrs => new Uint8Array(arrs.reduce((acc, arr) => acc.concat(arr), []))

describe('#transforms/resize', () => {
  const skater = ImageData.normalize(fixtureDecode('skater.jpg'))

  it('should resize using nearest neighbor', function () {
    this.timeout(TIMEOUT)
    const output = resize.nearestNeighbor(skater, {width: 100, height: 100});
    compareToFixture(ImageData.toBuffer(output), 'skater-nearest-neighbor.jpg')
  })
})
