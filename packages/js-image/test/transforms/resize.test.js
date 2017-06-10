const resize = require('../../lib/transforms/resize')
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/resize', () => {
  const yosemitePromise = fixtureDecode('yosemite-portrait.jpg').then(ImageData.normalize)

  it('should resize using nearest neighbor', () => {
    return yosemitePromise.then(yosemite => {
      const output = resize.nearestNeighbor(yosemite, {width: 100, height: 125})
      return compareToFixture(ImageData.toBuffer(output), 'yosemite-nearest-neighbor.jpg')
    })
  })

  it('should resize using bilinear', () => {
    return yosemitePromise.then(yosemite => {
      const output = resize.bilinear(yosemite, {width: 600, height: 750})
      return compareToFixture(ImageData.toBuffer(output), 'yosemite-bilinear-minor.jpg')
    })
  })

  it('should drastically resize using bilinear', () => {
    return yosemitePromise.then(yosemite => {
      const output = resize.bilinear(yosemite, {width: 100, height: 125})
      return compareToFixture(ImageData.toBuffer(output), 'yosemite-bilinear-drastic.jpg')
    })
  })
})
