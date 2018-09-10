const {ImageDataFormat} = require('../dist/types')
const ImageData = require('../dist/image-data').ImageData
const {expect, fixtureDecode, compareToFixture} = require('./utils')

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

  describe('#rotate', () => {
    const simpleLineOdd = {
      width: 3,
      height: 3,
      channels: 1,
      format: ImageData.GREYSCALE,
      data: [
        0, 0, 0,
        1, 1, 1,
        0, 0, 0,
      ],
    }

    const simpleLineEven = {
      width: 4,
      height: 4,
      channels: 1,
      format: ImageData.GREYSCALE,
      data: [
        0, 0, 0, 0,
        0, 0, 0, 0,
        1, 1, 1, 1,
        0, 0, 0, 0,
      ],
    }

    it('should rotate an odd-size image 45 degrees', () => {
      const result = ImageData.rotate(simpleLineOdd, 45)
      expect(result).to.eql({
        width: 3,
        height: 3,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([
          0, 0, 1,
          0, 1, 0,
          1, 0, 0,
        ]),
      })
    })

    it('should rotate an odd-size image 90 degrees', () => {
      const result = ImageData.rotate(simpleLineOdd, 90)
      expect(result).to.eql({
        width: 3,
        height: 3,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
        ]),
      })
    })

    it('should rotate an odd-size image 135 degrees', () => {
      const result = ImageData.rotate(simpleLineOdd, 135)
      expect(result).to.eql({
        width: 3,
        height: 3,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([
          1, 0, 0,
          0, 1, 0,
          0, 0, 1,
        ]),
      })
    })

    it('should rotate an even-size image 90 degrees', () => {
      const result = ImageData.rotate(simpleLineEven, 90)
      expect(result).to.eql({
        width: 4,
        height: 4,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([
          0, 0, 1, 0,
          0, 0, 1, 0,
          0, 0, 1, 0,
          0, 0, 1, 0,
        ]),
      })
    })

    it('should rotate an even-size image 270 degrees', () => {
      const result = ImageData.rotate(simpleLineEven, 270)
      expect(result).to.eql({
        width: 4,
        height: 4,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([
          0, 1, 0, 0,
          0, 1, 0, 0,
          0, 1, 0, 0,
          0, 1, 0, 0,
        ]),
      })
    })
  })

  describe('#toGreyscale', () => {
    it('should be no-op for greyscale images', () => {
      const imageData = {
        width: 10,
        height: 10,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array(100),
      }

      expect(ImageData.toGreyscale(imageData)).to.equal(imageData)
    })

    it('should use luminance for RGB images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.RGB,
        data: [
          100, 100, 100,
          0, 100, 0,
          100, 0, 0,
          0, 0, 100,
        ],
      }

      expect(ImageData.toGreyscale(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([100, 59, 30, 11]),
      })
    })

    it('should cycle through back to RGBA', async () => {
      const skaterData = await fixtureDecode('source-skater.jpg')
      const imageData = ImageData.normalize(skaterData)
      const greyscale = ImageData.toGreyscale(imageData)
      const rgba = ImageData.toRGBA(greyscale)
      await compareToFixture(ImageData.toBuffer(rgba), 'skater-greyscale.jpg')
    })
  })

  describe('#toHSL', () => {
    it('should convert greyscale images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([100, 50, 200, 30]),
      }

      expect(ImageData.toHSL(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.HSL,
        data: new Uint8Array([
          0, 0, 100,
          0, 0, 50,
          0, 0, 200,
          0, 0, 30,
        ]),
      })
    })

    it('should convert RGBA images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 4,
        format: ImageData.RGBA,
        data: new Uint8Array([
          255, 0, 0, 255,
          0, 255, 0, 255,
          255, 0, 255, 255,
          85, 185, 200, 255,
        ]),
      }

      expect(ImageData.toHSL(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.HSL,
        data: new Uint8Array([
          0, 255, 128,
          Math.round(255 * 120 / 360), 255, 128,
          Math.round(255 * 301 / 360), 255, 128,
          Math.round(255 * 188 / 360), 130, 143,
        ]),
      })
    })
  })

  describe('#toYCbCr', () => {
    it('should convert RGB images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        format: ImageDataFormat.RGB,
        data: new Uint8Array([
          255, 255, 255,
          255, 0, 0,
          0, 0, 255,
          128, 128, 128,
        ]),
      }

      expect(ImageData.toYCbCr(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        format: ImageDataFormat.YCbCr,
        data: new Uint8Array([
          255, 128, 128,
          76, 85, 255,
          29, 255, 107,
          128, 128, 128,
        ]),
      })
    })

    it('should cycle through back to RGBA', async () => {
      const rainbowData = await fixtureDecode('source-rainbow.jpg')
      const imageData = ImageData.normalize(rainbowData)
      const ycbcr = ImageData.toYCbCr(imageData)
      const rgba = ImageData.toRGBA(ycbcr)
      await compareToFixture(ImageData.toBuffer(rgba), 'rainbow-ycbcr.jpg')
    })
  })

  describe('#toRGB', () => {
    it('should inflate greyscale images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 1,
        format: ImageData.GREYSCALE,
        data: new Uint8Array([100, 50, 200, 30]),
      }

      expect(ImageData.toRGB(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.RGB,
        data: new Uint8Array([
          100, 100, 100,
          50, 50, 50,
          200, 200, 200,
          30, 30, 30,
        ]),
      })
    })

    it('should inflate YCbCr images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        format: ImageDataFormat.YCbCr,
        data: new Uint8Array([
          255, 128, 128,
          76, 85, 255,
          29, 255, 107,
          128, 128, 128,
        ]),
      }

      expect(ImageData.toRGB(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        format: ImageDataFormat.RGB,
        data: new Uint8Array([
          255, 255, 255,
          254, 0, 0,
          0, 0, 254,
          128, 128, 128,
        ]),
      })
    })
  })

  describe('#toRGBA', () => {
    it('should be no-op on rgba images', () => {
      return fixtureDecode('source-skater.jpg').then(skaterData => {
        const imageData = ImageData.normalize(skaterData)
        expect(ImageData.toRGBA(imageData)).to.equal(imageData)
      })
    })

    it('should add full alpha channel to RGB', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.RGB,
        data: [
          100, 100, 100,
          0, 100, 0,
          100, 0, 0,
          0, 0, 100,
        ],
      }

      expect(ImageData.toRGBA(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 4,
        format: ImageData.RGBA,
        data: new Uint8Array([
          100, 100, 100, 255,
          0, 100, 0, 255,
          100, 0, 0, 255,
          0, 0, 100, 255,
        ]),
      })
    })
  })

  describe('#removeAlphaChannel', () => {
    it('should convert RGBA to RGB', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 4,
        format: ImageData.RGBA,
        data: [
          100, 100, 100, 255,
          0, 100, 0, 255,
          100, 0, 0, 255,
          0, 0, 100, 255,
        ],
      }

      expect(ImageData.removeAlphaChannel(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        format: ImageData.RGB,
        data: new Uint8Array([
          100, 100, 100,
          0, 100, 0,
          100, 0, 0,
          0, 0, 100,
        ]),
      })
    })
  })

  describe('#toBrowserImageData', () => {
    it('should throw in node', () => {
      expect(() => {
        ImageData.toBrowserImageData({data: []})
      }).to.throw(/must be called in browser/)
    })
  })
})
