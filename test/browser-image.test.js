const jpeg = require('jpeg-js')

const ImageData = require('../lib/image-data').ImageData
const BrowserImage = require('../lib/browser-image').BrowserImage
const {expect, fixture, testImage, TIMEOUT} = require('./utils')

const skater = fixture('skater.jpg')
const testSkater = (...args) => testImage(BrowserImage, 'skater.jpg', ...args)
describe('BrowserImage', () => {
  describe('._applyResize', () => {
    it('should resize exactly', () => {
      const modify = img => img.resize({
        width: 100,
        height: 100,
      })

      return testSkater('browser-skater-square.jpg', modify)
    })
  })

  describe('._applyGreyscale', () => {
    it('should covert to greyscale', () => {
      const modify = img => img.greyscale()
      return testSkater('skater-greyscale.jpg', modify)
    })
  })

  describe('._applyEdges', () => {
    it('should find sobel edges', function () {
      this.timeout(TIMEOUT)
      const modify = img => img.edges()
      return testSkater('skater-sobel.jpg', modify)
    })

    it('should find canny edges', function () {
      this.timeout(TIMEOUT)
      const modify = img => img.edges(BrowserImage.CANNY)
      return testSkater('skater-canny-auto.jpg', modify)
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

      return BrowserImage.from(imageData).toImageData().then(data => {
        expect(data).to.eql(imageData)
      })
    })

    it('should be fast', function () {
      this.timeout(TIMEOUT)
      let promise = Promise.resolve(skater)
      for (let i = 0; i < 100; i++) {
        promise = promise.then(image => BrowserImage.from(image).toImageData())
      }

      return promise.then(imageData => {
        const decoded = ImageData.normalize(jpeg.decode(skater))
        expect(imageData.data.length).to.equal(decoded.data.length)
      })
    })

    it('should generate a valid image data', () => {
      const decoded = jpeg.decode(skater)
      return BrowserImage.from(skater).toImageData().then(imageData => {
        expect(imageData).to.have.property('width', decoded.width)
        expect(imageData).to.have.property('height', decoded.height)
        expect(imageData).to.have.property('data').with.length(decoded.data.length)
      })
    })
  })

  describe('.toBuffer', () => {
    it('should output the buffer', () => {
      const image = BrowserImage.from(skater)
      return image.toBuffer().then(buffer => {
        expect(buffer).to.be.instanceOf(Buffer)
        expect(buffer.length).to.be.within(skater.length - 5000, skater.length + 5000)
      })
    })
  })

  describe('#from', () => {
    it('should return an image from image data', () => {
      const image = BrowserImage.from(jpeg.decode(skater))
      expect(image).to.be.instanceOf(BrowserImage)
    })

    it('should return an image from buffer', () => {
      const image = BrowserImage.from(skater)
      expect(image).to.be.instanceOf(BrowserImage)
    })
  })
})
