const ImageData = require('../lib/image-data')
const {expect} = require('./utils')

describe('ImageData', () => {
  describe('#probablyIs', () => {
    const pixel = value => [value, value, value, 255]

    it('should identify invalid values', () => {
      expect(ImageData.probablyIs()).to.be.false
      expect(ImageData.probablyIs(null)).to.be.false
      expect(ImageData.probablyIs(Buffer.from([]))).to.be.false
      expect(ImageData.probablyIs(false)).to.be.false
      expect(ImageData.probablyIs(2)).to.be.false
      expect(ImageData.probablyIs({data: undefined})).to.be.false
      expect(ImageData.probablyIs({width: '2', height: 1, data: []})).to.be.false
    })

    it('should identify Array-based', () => {
      const pixels = [...pixel(128), ...pixel(255), ...pixel(0), ...pixel(0)]
      expect(ImageData.probablyIs({width: 2, height: 2, data: pixels})).to.be.true
    })

    it('should identify Uint8Array-based', () => {
      expect(ImageData.probablyIs({width: 10, height: 10, data: new Uint8Array(400)})).to.be.true
    })

    it('should identify Buffer-based', () => {
      const pixels = Buffer.from([...pixel(128), ...pixel(255), ...pixel(0), ...pixel(0)])
      expect(ImageData.probablyIs({width: 2, height: 2, data: pixels})).to.be.true
    })

    it('should enforce pixel length', () => {
      expect(ImageData.probablyIs({width: 10, height: 10, data: new Uint8Array(87)})).to.be.false
    })
  })
})
