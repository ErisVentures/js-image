const jpeg = require('jpeg-js')
const ImageData = require('../lib/image-data').ImageData
const {expect, fixture} = require('./utils')

describe('ImageData', () => {
  const pixel = value => [value, value, value, 255]

  describe('#probablyIs', () => {
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

  describe('#is', () => {
    it('should identify invalid values', () => {
      expect(ImageData.is()).to.be.false
      expect(ImageData.is(null)).to.be.false
      expect(ImageData.is(Buffer.from([]))).to.be.false
      expect(ImageData.is(false)).to.be.false
      expect(ImageData.is(2)).to.be.false
      expect(ImageData.is({data: undefined})).to.be.false
      expect(ImageData.is({width: '2', height: 1, data: []})).to.be.false
      expect(ImageData.is({width: 1, height: 1, data: [0]})).to.be.false
      expect(ImageData.is({width: 1, height: 1, data: [0], channels: 1})).to.be.false
    })

    it('should enforce format', () => {
      const imageData = {
        width: 10,
        height: 10,
        channels: 3,
        format: 'jpeg',
        data: new Uint8Array(300),
      }

      expect(ImageData.is(imageData)).to.be.false
      expect(ImageData.is(Object.assign(imageData, {format: ImageData.RGB}))).to.be.true
    })

    it('should enforce pixel length', () => {
      const imageData = {
        width: 10,
        height: 10,
        channels: 3,
        format: 'rgb',
        data: new Uint8Array(100),
      }

      expect(ImageData.is(imageData)).to.be.false
      expect(ImageData.is(Object.assign(imageData, {channels: 1}))).to.be.true
    })
  })

  describe('#removeAlphaChannel', () => {
    it('should convert RGBA to RGB', () => {
      const imageData = ImageData.normalize(jpeg.decode(fixture('skater.jpg')))
      const result = ImageData.removeAlphaChannel(imageData)

      expect(result).to.have.property('format', ImageData.RGB)
      expect(result).to.have.property('channels', 3)
      expect(result.data.length).to.equal(imageData.data.length / 4 * 3)
    })
  })
})
