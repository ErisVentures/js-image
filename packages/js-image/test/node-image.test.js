const jpeg = require('jpeg-js')

const NodeImage = require('../lib/node-image')
const {expect, fixture} = require('./utils')

describe('NodeImage', () => {
  describe('#from', () => {
    it('should return an image from image data', () => {
      const image = NodeImage.from(jpeg.decode(fixture('skater.jpg')))
      expect(image).to.be.instanceOf(NodeImage)
    })

    it('should return an image from buffer', () => {
      const image = NodeImage.from(fixture('skater.jpg'))
      expect(image).to.be.instanceOf(NodeImage)
    })
  })
})
