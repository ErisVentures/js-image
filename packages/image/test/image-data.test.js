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

      expect(result).toEqual({
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

      expect(result).toEqual({
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
      expect(fn(hslImageData(180, 1, 0.5))).toBe(1)
      expect(fn(hslImageData(180, 0.5, 0.5))).toBe(0.75)
      expect(fn(hslImageData(0, 0, 0))).toBe(0)
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
      expect(fn(hslImageData(355, 1, 0.5))).toBe(1)
      expect(fn(hslImageData(0, 1, 0.5))).toBe(0.99)
    })
  })

  describe('#probablyIs', () => {
    it('should identify invalid values', () => {
      expect(ImageData.probablyIs()).toBe(false)
      expect(ImageData.probablyIs(null)).toBe(false)
      expect(ImageData.probablyIs(Buffer.from([]))).toBe(false)
      expect(ImageData.probablyIs(false)).toBe(false)
      expect(ImageData.probablyIs(2)).toBe(false)
      expect(ImageData.probablyIs({data: undefined})).toBe(false)
      expect(ImageData.probablyIs({width: '2', height: 1, data: []})).toBe(false)
    })

    it('should identify Array-based', () => {
      const pixels = [...pixel(128), ...pixel(255), ...pixel(0), ...pixel(0)]
      expect(ImageData.probablyIs({width: 2, height: 2, data: pixels})).toBe(true)
    })

    it('should identify Uint8Array-based', () => {
      expect(ImageData.probablyIs({width: 10, height: 10, data: new Uint8Array(400)})).toBe(true)
    })

    it('should identify Buffer-based', () => {
      const pixels = Buffer.from([...pixel(128), ...pixel(255), ...pixel(0), ...pixel(0)])
      expect(ImageData.probablyIs({width: 2, height: 2, data: pixels})).toBe(true)
    })

    it('should enforce pixel length', () => {
      expect(ImageData.probablyIs({width: 10, height: 10, data: new Uint8Array(87)})).toBe(false)
    })
  })

  describe('#is', () => {
    it('should identify invalid values', () => {
      expect(ImageData.is()).toBe(false)
      expect(ImageData.is(null)).toBe(false)
      expect(ImageData.is(Buffer.from([]))).toBe(false)
      expect(ImageData.is(false)).toBe(false)
      expect(ImageData.is(2)).toBe(false)
      expect(ImageData.is({data: undefined})).toBe(false)
      expect(ImageData.is({width: '2', height: 1, data: []})).toBe(false)
      expect(ImageData.is({width: 1, height: 1, data: [0]})).toBe(false)
      expect(ImageData.is({width: 1, height: 1, data: [0], channels: 1})).toBe(false)
    })

    it('should enforce format', () => {
      const imageData = {
        width: 10,
        height: 10,
        channels: 3,
        colorspace: 'what?',
        data: new Uint8Array(300),
      }

      expect(ImageData.is(imageData)).toBe(false)
      expect(ImageData.is(Object.assign(imageData, {colorspace: Colorspace.RGB}))).toBe(true)
    })

    it('should enforce pixel length', () => {
      const imageData = {
        width: 10,
        height: 10,
        channels: 3,
        colorspace: 'rgb',
        data: new Uint8Array(100),
      }

      expect(ImageData.is(imageData)).toBe(false)
      expect(ImageData.is(Object.assign(imageData, {channels: 1}))).toBe(true)
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

    const simpleRectangle = {
      width: 6,
      height: 3,
      channels: 1,
      colorspace: Colorspace.Greyscale,
      data: [
        1, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0,
      ],
    }

    it('should rotate an odd-size image 45 degrees', () => {
      const result = ImageData.rotate(simpleLineOdd, 45)
      expect(result).toEqual({
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
      expect(result).toEqual({
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
      expect(result).toEqual({
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
      expect(result).toEqual({
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
      expect(result).toEqual({
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

    it('should rotate a rectangular image 90 degrees', () => {
      const result = ImageData.rotate(simpleRectangle, 90)
      expect(result).toEqual({
        width: 3,
        height: 6,
        channels: 1,
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array([
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          1, 1, 1,
        ]),
      })
    })

    it('should rotate a rectangular image 180 degrees', () => {
      const result = ImageData.rotate(simpleRectangle, 180)
      expect(result).toEqual({
        width: 6,
        height: 3,
        channels: 1,
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array([
          0, 0, 0, 0, 0, 1,
          1, 1, 1, 1, 1, 1,
          0, 0, 0, 0, 0, 1,
        ]),
      })
    })

    it('should rotate a rectangular image 270 degrees', () => {
      const result = ImageData.rotate(simpleRectangle, 270)
      expect(result).toEqual({
        width: 3,
        height: 6,
        channels: 1,
        colorspace: Colorspace.Greyscale,
        data: new Uint8Array([
          1, 1, 1,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
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

      expect(ImageData.toGreyscale(imageData)).toBe(imageData)
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

      expect(ImageData.toGreyscale(imageData)).toEqual({
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
      expect(ImageData.toYCbCr(greyscale)).toEqual(imageData)
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

      expect(ImageData.toHSL(imageData)).toEqual({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.HSL,
        data: new Float32Array([
          0, 0, 0.3921568691730499,
          0, 0, 0.19607843458652496,
          0, 0, 0.7843137383460999,
          0, 0, 0.11764705926179886,
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

      expect(ImageData.toHSL(imageData)).toEqual({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.HSL,
        data: new Float32Array([
          0, 1, 0.5,
          120, 1, 0.5,
          300, 1, 0.5,
          0, 0, 1,
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
          0, 1, 0.5,
          60, 1, 0.5,
          0, 1, 1,
          300, 1, 0.5,
        ],
      }

      expect(ImageData.toRGB(imageData)).toEqual({
        width: 2,
        height: 2,
        channels: 3,
        colorspace: Colorspace.RGB,
        data: new Uint8Array([
          255, 0, 0,
          255, 255, 0,
          255, 255, 255,
          255, 0, 255,
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
      expect(converted).toEqual({
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
      expect(converted).toEqual({
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
      expect(converted).toEqual({
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
    // describe.skip('with WASM', () => {
    //   beforeAll(async () => {
    //     await enableWASM()
    //   })

    //   it('should use wasm', async () => {
    //     ImageData.toYCbCr(await fixtureDecode('source-yosemite.jpg').then(ImageData.normalize))
    //   })

    //   afterAll(() => {
    //     disableWASM()
    //   })
    // })

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

      expect(ImageData.toYCbCr(imageData)).toEqual({
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

      expect(ImageData.toRGB(imageData)).toEqual({
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

      expect(ImageData.toRGB(imageData)).toEqual({
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
        expect(ImageData.toRGBA(imageData)).toBe(imageData)
      });
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

      expect(ImageData.toRGBA(imageData)).toEqual({
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

      expect(ImageData.removeAlphaChannel(imageData)).toEqual({
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
      }).toThrowError(/must be called in browser/)
    })
  })

  describe('WASM', () => {
    if (!process.env.ENABLE_WASM) {
      it.skip('should enable WASM for these tests', () => undefined)
      return
    }

    beforeAll(async () => {
      await enableWASM()
    })

    afterAll(async () => {
      await disableWASM()
    })

    describe('#toXYZ', () => {
      it('should handle simple cases', () => {
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

        const xyz = ImageData.toXYZ(imageData)
        const rgb = ImageData.toRGB(xyz)
        xyz.data = xyz.data.map(x => Math.round(x * 1000))
        expect(xyz).toEqual({
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

        expect(rgb).toEqual({
          width: 2,
          height: 2,
          channels: 3,
          colorspace: Colorspace.RGB,
          data: new Uint8Array([
            255, 255, 255,
            255, 1, 0,
            0, 255, 1,
            1, 0, 255,
          ]),
        })
      })

      it('should handle images', async () => {
        const rainbowData = await fixtureDecode('source-rainbow.jpg')
        const imageData = ImageData.normalize(rainbowData)
        const xyz = ImageData.toXYZ(imageData)
        const rgba = ImageData.toRGBA(xyz)
        await compareToFixture(ImageData.toBuffer(rgba), 'rainbow.jpg', {strict: false})
      })
    })
  })
})
