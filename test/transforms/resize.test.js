const resize = require('../../lib/transforms/resize')
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/resize', () => {
  const skater = ImageData.normalize(fixtureDecode('skater.jpg'))

  it('should resize using nearest neighbor', () => {
    const output = resize.nearestNeighbor(skater, {width: 100, height: 100})
    compareToFixture(ImageData.toBuffer(output), 'skater-nearest-neighbor.jpg')
  })
})
