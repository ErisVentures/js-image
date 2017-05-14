const jpeg = require('jpeg-js')

const ImageData = require('../lib/image-data').ImageData
const NodeImage = require('../lib/node-image').NodeImage
const {expect, fixture, testImage, TIMEOUT} = require('./utils')

const skater = fixture('skater.jpg')
const testSkater = (...args) => testImage(NodeImage, 'skater.jpg', ...args)
const testYosemite = (...args) => testImage(NodeImage, 'yosemite-portrait.jpg', ...args)
const testOpera = (...args) => testImage(NodeImage, 'opera-landscape.jpg', ...args)
describe('NodeImage', () => {
  describe('._applyFormat', () => {
    it('should support jpeg', () => {
      const modify = img => img.format({type: 'jpeg', quality: 50})
      return testSkater('skater-poor.jpg', modify)
    })

    it('should support png', () => {
      const modify = img => img.format('png')
      return testSkater('skater.png', modify)
    })
  })

  describe('._applyResize', () => {
    it('should support cover', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        method: NodeImage.COVER,
      })

      return testYosemite('yosemite-square-cover.jpg', modify)
    })

    it('should support contain', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        method: NodeImage.CONTAIN,
      })

      return testYosemite('yosemite-square-contain.jpg', modify)
    })

    it('should support crop', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        method: NodeImage.CROP,
      })

      return testOpera('opera-square-crop.jpg', modify)
    })

    it('should support exact', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        method: NodeImage.EXACT,
      })

      return testOpera('opera-square-exact.jpg', modify)
    })
  })

  describe('._applyGreyscale', () => {
    it('should covert to greyscale', () => {
      const modify = img => img.greyscale()
      return testYosemite('yosemite-greyscale.jpg', modify)
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

    it('should be fast', function () {
      this.timeout(TIMEOUT)
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
