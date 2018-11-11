const {Colorspace} = require('../dist/types')
const ImageData = require('../dist/image-data').ImageData
const {expect, fixtureDecode, compareToFixture, enableWASM, disableWASM} = require('./utils')

describe('ImageData', () => {
  const pixel = value => [value, value, value, 255]

  describe('#mapPixels', () => {
    it('should evaluate the function', () => {
      const imageData = {
        width: 1,
        height: 1,
        channels: 3,
        colorspace: 'rgb',
        data: [1, 2, 3],
      }

      const result = ImageData.mapPixels(imageData, ({values}) => values.map(x => x + 1))

      expect(result).to.eql({
        width: 1,
        height: 1,
        channels: 3,
        colorspace: 'rgb',
        data: new Uint8Array([2, 3, 4]),
      })
    })

    it('should evaluate the functions in order', () => {
      const imageData = {
        width: 1,
        height: 1,
        channels: 1,
        colorspace: 'k',
        data: [10],
      }

      const result = ImageData.mapPixels(imageData, [
        ({values}) => [values[0] / 2],
        ({values}) => [values[0] + 2],
      ])

      expect(result).to.eql({
        width: 1,
        height: 1,
        channels: 1,
        colorspace: 'k',
        data: new Uint8Array([7]),
      })
    })
  })

  describe('#proximityTransform', () => {
    const hslImageData = (h, s, l) => ({colorspace: 'hsl', data: [h, s, l], channels: 3, width: 1, height: 1})

    it('should evaluate based on proximity', () => {
      const transform = data => ImageData.proximityTransform(
        data,
        [{filterChannels: ['h', 's', 'l'],
        filterChannelCenters: [180, 1, 0.5],
        filterChannelRanges: [180, 1, 0.5],
        targetChannel: 'l',
        targetIntensity: 0.5}]
      )

      const fn = imageData => Math.round(100 * transform(imageData).data[2]) / 100
      expect(fn(hslImageData(180, 1, 0.5))).to.equal(1)
      expect(fn(hslImageData(180, 0.5, 0.5))).to.equal(0.75)
      expect(fn(hslImageData(0, 0, 0))).to.equal(0)
    })

    it('should handle wrap around hue', () => {
      const transform = data => ImageData.proximityTransform(
        data,
        [{filterChannels: ['h', 's', 'l'],
        filterChannelCenters: [355, 1, 0.5],
        filterChannelRanges: [355, 1, 0.5],
        targetChannel: 'l',
        targetIntensity: 0.5}]
      )

      const fn = imageData => Math.round(100 * transform(imageData).data[2]) / 100
      expect(fn(hslImageData(355, 1, 0.5))).to.equal(1)
      expect(fn(hslImageData(0, 1, 0.5))).to.equal(0.99)
    })
  })

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
        colorspace: 'what?',
        data: new Uint8Array(300),
      }

      expect(ImageData.is(imageData)).to.be.false
      expect(ImageData.is(Object.assign(imageData, {colorspace: Colorspace.RGB}))).to.be.true
    })

    it('should enforce pixel length', () => {
      const imageData = {
        width: 10,
        height: 10,
        channels: 3,
        colorspace: 'rgb',
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
      colorspace: Colorspace.Greyscale,
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
      colorspace: Colorspace.Greyscale,
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
        colorspace: Colorspace.Greyscale,
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
        colorspace: Colorspace.Greyscale,
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
        colorspace: Colorspace.Greyscale,
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
        colorspace: Colorspace.Greyscale,
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
        colorspace: Colorspace.Greyscale,
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
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array(100),
      }

      expect(ImageData.toGreyscale(imageData)).to.equal(imageData)
    })

    it('should use luminance for RGB images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
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
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array([100, 59, 30, 11]),
      })
    })

    it('should cycle with non-rgb images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.YCbCr,
        data: new Uint8Array([
          100, 128, 128,
          0, 128, 128,
          50, 128, 128,
          192, 128, 128,
        ]),
      }

      const greyscale = ImageData.toGreyscale(imageData)
      expect(ImageData.toYCbCr(greyscale)).to.eql(imageData)
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
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array([100, 50, 200, 30]),
      }

      expect(ImageData.toHSL(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.HSL,
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
        colorspace: Colorspace.RGBA,
        data: new Uint8Array([
          255, 0, 0, 255,
          0, 255, 0, 255,
          255, 0, 255, 255,
          255, 255, 255, 255,
        ]),
      }

      expect(ImageData.toHSL(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.HSL,
        data: new Uint8Array([
          0, 255, 128,
          85, 255, 128,
          213, 255, 128,
          0, 0, 255,
        ]),
      })
    })

    it('should convert back to rgb', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.HSL,
        data: [
          0, 255, 127,
          43, 255, 127,
          0, 255, 255,
          213, 255, 127,
        ],
      }

      expect(ImageData.toRGB(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
        data: new Uint8Array([
          254, 0, 0,
          251, 254, 0,
          255, 255, 255,
          254, 0, 251,
        ]),
      })
    })

    it('should handle the rainbow', async () => {
      const rainbowData = await fixtureDecode('source-rainbow.jpg')
      const imageData = ImageData.normalize(rainbowData)
      const hsl = ImageData.toHSL(imageData)
      const rgba = ImageData.toRGBA(hsl)
      await compareToFixture(ImageData.toBuffer(rgba), 'rainbow.jpg', {strict: false})
    })
  })

  describe('#toHCL', () => {
    it('should convert to HCL', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
        data: new Uint8Array([
          255, 255, 255,
          255, 0, 0,
          0, 255, 0,
          0, 0, 255,
        ]),
      }

      const converted = ImageData.toHCL(imageData)
      converted.data = converted.data.map(
        (x, idx) => idx % 3 === 0 ? Math.round(x) : Math.round(x * 100) / 100
      )
      expect(converted).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.HCL,
        data: [
          5, 0, 1,
          0, 0.33, 0.21,
          93, 0.27, 0.72,
          239, 0.31, .07,
        ],
      })
    })

    it('should cycle through back to RGBA', async () => {
      const rainbowData = await fixtureDecode('source-rainbow.jpg')
      const imageData = ImageData.normalize(rainbowData)
      const ycbcr = ImageData.toHCL(imageData)
      const rgba = ImageData.toRGBA(ycbcr)
      await compareToFixture(ImageData.toBuffer(rgba), 'rainbow.jpg', {strict: false})
    })
  })

  describe('#toXYZ', () => {
    it('should convert to XYZ', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
        data: new Uint8Array([
          255, 255, 255,
          255, 0, 0,
          0, 255, 0,
          0, 0, 255,
        ]),
      }

      const converted = ImageData.toXYZ(imageData)
      converted.data = converted.data.map(x => Math.round(x * 1000))
      expect(converted).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.XYZ,
        data: [
          951, 1000, 1089,
          412, 213, 19,
          358, 715, 119,
          181, 72, 951,
        ],
      })
    })

    it('should handle calibration profiles', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
        data: new Uint8Array([
          255, 255, 255,
          255, 0, 0,
          0, 255, 0,
          0, 0, 255,
        ]),
      }

      const converted = ImageData.toXYZ(imageData, {
        xRed: 0.25,
        yRed: 0.5,
        zRed: 0.25,
        xGreen: 0.25,
        yGreen: 0.5,
        zGreen: 0.25,
        xBlue: 0.75,
        yBlue: 0.5,
        zBlue: 0.25,
      })

      converted.data = converted.data.map(x => Math.round(x * 1000))
      expect(converted).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.XYZ,
        data: [
          1250, 1500, 750,
          250, 500, 250,
          250, 500, 250,
          750, 500, 250,
        ],
      })
    })

    it('should handle the rainbow', async () => {
      const rainbowData = await fixtureDecode('source-rainbow.jpg')
      const imageData = ImageData.normalize(rainbowData)
      const xyz = ImageData.toXYZ(imageData)
      const rgba = ImageData.toRGBA(xyz)
      await compareToFixture(ImageData.toBuffer(rgba), 'rainbow.jpg', {strict: false})
    })
  })

  describe('#toYCbCr', () => {
    const yosemitePromise = fixtureDecode('source-yosemite.jpg').then(ImageData.normalize)

    describe.skip('with WASM', () => {
      before(async () => {
        await enableWASM()
      })

      it('should use wasm', async () => {
        ImageData.toYCbCr(await yosemitePromise)
      })

      after(() => {
        disableWASM()
      })
    })

    it('should convert RGB images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
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
        colorspace: Colorspace.YCbCr,
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
      await compareToFixture(ImageData.toBuffer(rgba), 'rainbow.jpg', {strict: false})
    })
  })

  describe('#toRGB', () => {
    it('should inflate greyscale images', () => {
      const imageData = {
        width: 2,
        height: 2,
        channels: 1,
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array([100, 50, 200, 30]),
      }

      expect(ImageData.toRGB(imageData)).to.eql({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
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
        colorspace: Colorspace.YCbCr,
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
        colorspace: Colorspace.RGB,
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
        colorspace: Colorspace.RGB,
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
        colorspace: Colorspace.RGBA,
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
        colorspace: Colorspace.RGBA,
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
        colorspace: Colorspace.RGB,
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
