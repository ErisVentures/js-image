const {bilinear} = require('../../dist/transforms/resize')
const {sobel} = require('../../dist/transforms/sobel')
const {normalize} = require('../../dist/transforms/normalize')
const ImageData = require('../../dist/image-data').ImageData
const {fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/normalize', () => {
  it('should work on normal photos', async () => {
    const normalized1 = normalize(await fixtureDecode('source-wedding-1.jpg'))
    await compareToFixture(ImageData.toBuffer(normalized1), 'wedding-1-normalized.jpg')
    const normalized2 = normalize(await fixtureDecode('source-wedding-2.jpg'))
    await compareToFixture(ImageData.toBuffer(normalized2), 'wedding-2-normalized.jpg')
  })

  it('should adjust midpoint', async () => {
    const normalized = normalize(
      await fixtureDecode('source-sydney-in-focus.jpg', {midpointNormalization: 0.5}),
    )
    await compareToFixture(ImageData.toBuffer(normalized), 'sydney-in-focus-normalized.jpg')
  })

  it('should work on sobel data', async () => {
    const imageData = await fixtureDecode('source-sydney-in-focus.jpg')
    const sobelData = sobel(ImageData.normalize(imageData))
    const smallData = bilinear(sobelData, {width: 32, height: 32})
    const normalized = normalize(smallData, {strength: 0.5})
    await compareToFixture(ImageData.toBuffer(normalized), 'syndey-sobel-normalized.jpg')
  })
})
