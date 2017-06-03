const canny = require('../../lib/transforms/canny').canny
const ImageData = require('../../lib/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/canny', () => {
  const imageDataPromise = fixtureDecode('skater.jpg').then(ImageData.normalize)

  it('should find edges', () => {
    return imageDataPromise.then(imageData => {
      const output = canny(imageData)
      const jpegOutput = ImageData.toBuffer(output)
      return compareToFixture(jpegOutput, 'skater-canny-auto.jpg')
    })
  })

  it('should find edges with fixed threshold', () => {
    return imageDataPromise.then(imageData => {
      const output = canny(imageData, {lowThreshold: 75, highThreshold: 150})
      const jpegOutput = ImageData.toBuffer(output)
      return compareToFixture(jpegOutput, 'skater-canny-fixed.jpg')
    })
  })
})
