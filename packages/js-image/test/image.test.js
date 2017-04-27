const Image = require('../lib/image')
const expect = require('./utils').expect

describe('lib/image.js', () => {
  describe('#isImageData', () => {
    const pixel = value => [value, value, value, 255]

    it('should identify invalid values', () => {
      expect(Image.isImageData()).to.be.false
      expect(Image.isImageData(null)).to.be.false
      expect(Image.isImageData(Buffer.from([]))).to.be.false
      expect(Image.isImageData(false)).to.be.false
      expect(Image.isImageData(2)).to.be.false
      expect(Image.isImageData({data: undefined})).to.be.false
      expect(Image.isImageData({width: '2', height: 1, data: []})).to.be.false
    })

    it('should identify Array-based', () => {
      const pixels = [...pixel(128), ...pixel(255), ...pixel(0), ...pixel(0)]
      expect(Image.isImageData({width: 2, height: 2, data: pixels})).to.be.true
    })

    it('should identify Uint8Array-based', () => {
      expect(Image.isImageData({width: 10, height: 10, data: new Uint8Array(400)})).to.be.true
    })

    it('should enforce pixel length', () => {
      expect(Image.isImageData({width: 10, height: 10, data: new Uint8Array(100)})).to.be.false
    })
  })
})
