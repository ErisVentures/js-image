const jpeg = require('jpeg-js')

const ImageData = require('../lib/image-data')
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

  describe('.toImageData', () => {
    it('should handle RGB image data', () => {
      const pixels = Buffer.from([
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
      ])

      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.RGB,
        data: pixels,
      }

      return NodeImage.from(imageData).toImageData().then(data => {
        expect(data).to.eql(imageData)
      })
    })

    it('should be fast', () => {
      let promise = Promise.resolve(skater)
      for (let i = 0; i < 100; i++) {
        promise = promise.then(image => NodeImage.from(image).toImageData())
      }

      return promise.then(imageData => {
        const srcImageData = ImageData.normalize(jpeg.decode(skater))
        const decoded = ImageData.removeAlphaChannel(srcImageData)
        expect(imageData.data.length).to.equal(decoded.data.length)
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
