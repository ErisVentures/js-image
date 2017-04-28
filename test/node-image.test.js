const jpeg = require('jpeg-js')

const NodeImage = require('../lib/node-image')
const {expect, fixture, compareToFixture} = require('./utils')

const skater = fixture('skater.jpg')
describe('NodeImage', () => {
  describe('._setFormat', () => {
    it('should support jpeg', () => {
      const image = NodeImage.from(skater).format('jpeg', {quality: 50})
      return image.toBuffer().then(buffer => {
        compareToFixture(buffer, 'skater-poor.jpg')
      })
    })

    it('should support png', () => {
      const image = NodeImage.from(skater).format('png')
      return image.toBuffer().then(buffer => {
        compareToFixture(buffer, 'skater.png')
      })
    })
  })

  describe('.toBuffer', () => {
    it('should output the buffer', () => {
      const image = NodeImage.from(skater)
      return image.toBuffer().then(buffer => {
        expect(buffer).to.be.instanceOf(Buffer)
        expect(buffer.length).to.be.within(skater.length - 5000, skater.length + 5000)
      })
    })
  })

  describe('#from', () => {
    it('should return an image from image data', () => {
      const image = NodeImage.from(jpeg.decode(skater))
      expect(image).to.be.instanceOf(NodeImage)
    })

    it('should return an image from buffer', () => {
      const image = NodeImage.from(skater)
      expect(image).to.be.instanceOf(NodeImage)
    })
  })
})
