const {noise} = require('../../dist/effects/noise')
const ImageData = require('../../dist/image-data').ImageData
const {compareToFixture} = require('../utils')

describe('#effects/noise', () => {
  it('should generate some predictable noise', async () => {
    const output = noise(200, 200, {seed: 'test'})
    await compareToFixture(ImageData.toBuffer(output), 'noise.jpg')
  })
})
