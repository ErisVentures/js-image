const resize = require('../../lib/transforms/resize')
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/resize', () => {
  const skaterPromise = fixtureDecode('skater.jpg').then(ImageData.normalize)

  it('should resize using nearest neighbor', () => {
    return skaterPromise.then(skater => {
      const output = resize.nearestNeighbor(skater, {width: 100, height: 100})
      return compareToFixture(ImageData.toBuffer(output), 'skater-nearest-neighbor.jpg')
    })
  })
})
