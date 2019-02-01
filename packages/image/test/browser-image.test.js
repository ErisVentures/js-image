const jpeg = require('jpeg-js')

const {ImageResizeMethod} = require('../dist/types')
const ImageData = require('../dist/image-data').ImageData
const BrowserImage = require('../dist/browser-image').BrowserImage
const {expect, fixture, fixtureDecode, compareToFixture, testImage, enableWASM, disableWASM} = require('./utils')

const skater = fixture('source-skater.jpg')
const sydney = fixture('source-sydney.jpg')
const skaterRotated = fixture('source-skater-rotated.jpg')
const yosemite = fixture('source-yosemite.jpg')
const testSkater = (...args) => testImage(BrowserImage, 'source-skater.jpg', ...args)
const testYosemite = (...args) => testImage(BrowserImage, 'source-yosemite.jpg', ...args)
const testOpera = (...args) => testImage(BrowserImage, 'source-sydney.jpg', ...args)

describe('BrowserImage', () => {
  describe('._applyFormat', () => {
    it('should support jpeg', () => {
      const modify = img => img.format({type: 'jpeg', quality: 50})
      return testSkater('skater-poor.jpg', modify, {
        strict: false,
        tolerance: 10,
      })
    })

    it('should support png', () => {
      const modify = img => img.format('png')
      return testSkater('skater.png', modify, {
        strict: false,
        tolerance: 5,
      })
    })
  })

  describe('._applyResize', () => {
    it('should support subselect', () => {
      const modify = img =>
        img.resize({
          width: 100,
          height: 80,
          fit: 'exact',
          subselect: {
            top: 200,
            bottom: 800,
            left: 100,
            right: 700,
          },
        })

      return testYosemite('yosemite-subselect.jpg', modify, {
        strict: false,
        tolerance: 35,
      })
    })

    it('should resize with bilinear', () => {
      const modify = img =>
        img.resize({
          width: 600,
          height: 750,
          method: 'bilinear',
        })
      return testYosemite('yosemite-bilinear-minor.jpg', modify)
    })

    it('should support cover', () => {
      const modify = img =>
        img.resize({
          width: 200,
          height: 200,
          fit: 'cover',
        })

      return testYosemite('yosemite-square-cover.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should support contain', () => {
      const modify = img =>
        img.resize({
          width: 200,
          height: 200,
          fit: 'contain',
        })

      return testYosemite('yosemite-square-contain.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should support crop', () => {
      const modify = img =>
        img.resize({
          width: 200,
          height: 200,
          fit: 'crop',
        })

      return testOpera('opera-square-crop.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should support exact', () => {
      const modify = img =>
        img.resize({
          width: 200,
          height: 200,
          fit: 'exact',
        })

      return testOpera('opera-square-exact.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })
  })

  describe('._applyGreyscale', () => {
    it('should covert to greyscale', () => {
      const modify = img => img.greyscale()
      return testSkater('skater-greyscale.jpg', modify)
    })
  })

  describe('._applyLayers', () => {
    it('should merge multiple images', async () => {
      const sizeOptions = {width: 200, height: 200, fit: 'crop'}
      const imageA = BrowserImage.from(skater).resize(sizeOptions)
      const imageB = BrowserImage.from(yosemite).resize(sizeOptions)
      const imageC = BrowserImage.from(sydney).resize(sizeOptions)

      const layers = [
        {imageData: await imageB.toImageData(), opacity: 0.5},
        {imageData: await imageC.toImageData(), opacity: 0.33},
      ]

      const buffer = await imageA.layers(layers).toBuffer()
      await compareToFixture(buffer, 'layers-merged.jpg', {strict: false, tolerance: 15})
    })
  })

  describe('._applyCalibrate', () => {
    it('should apply a calibration profile', async () => {
      const modify = img => img.calibrate({
        redHueShift: -0.5,
        redSaturationShift: 0.5,
        greenHueShift: 0.5,
        greenSaturationShift: -0.5,
        blueHueShift: 0.5,
        blueSaturationShift: 0.5,
      })

      await testSkater('skater-calibrate.jpg', modify, {strict: false})
    })

    describe('WASM', () => {
      before(async () => {
        await enableWASM()
      })

      after(async () => {
        await disableWASM()
      })

      it('should apply a calibration profile', async () => {
        const modify = img => img.calibrate({
          redHueShift: -0.5,
          redSaturationShift: 0.5,
          greenHueShift: 0.5,
          greenSaturationShift: -0.5,
          blueHueShift: 0.5,
          blueSaturationShift: 0.5,
        })

        await testSkater('skater-calibrate.jpg', modify, {strict: false})
      })
    })
  })

  describe('._applyTone', () => {
    it('should increase contrast', async () => {
      const modify = img => img.tone({contrast: 0.5})
      await testSkater('skater-contrast.jpg', modify, {strict: false})
    })

    it('should increase saturation', async () => {
      const modify = img => img.tone({saturation: 1})
      await testSkater('skater-saturation-plus.jpg', modify, {
        strict: false,
        tolerance: 10,
      })
    })

    it('should decrease saturation', async () => {
      const modify = img => img.tone({saturation: -0.5})
      await testSkater('skater-saturation-minus.jpg', modify, {strict: false})
    })

    it('should apply multiple tone adjustments', async () => {
      const modify = img => img.tone({
        whites: 30,
        highlights: -20,
        midtones: 30,
        shadows: 50,
        blacks: -20,
      })

      await testSkater('skater-tone.jpg', modify, {strict: false})
    })

    it('should apply curves', async () => {
      const modify = img => img.tone({
        curve: [[0, 50], [75, 65], [175, 185], [255, 200]]
      })

      await testSkater('skater-curves.jpg', modify, {strict: false})
    })

    it('should apply R,G,B curves', async () => {
      const modify = img => img.tone({
        redCurve: [[0, 0], [60, 80], [128, 128], [255, 255]],
        greenCurve: [[0, 0], [128, 128], [192, 250], [255, 255]],
        blueCurve: [[0, 0], [60, 60], [128, 60], [192, 192], [255, 255]],
      })

      await testSkater('skater-curves-rgb.jpg', modify, {strict: false})
    })
  })

  describe('._applySharpen', () => {
    it('should sharpen the image', () => {
      const modify = img => img.sharpen()
      return testSkater('skater-sharpen.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should sharpen the image with options', () => {
      const modify = img => img.sharpen({strength: 0.25})
      return testSkater('skater-sharpen-0.25.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })
  })

  describe('._applyEdges', () => {
    it('should find sobel edges', () => {
      const modify = img => img.edges()
      return testSkater('skater-browser-edges-sobel.jpg', modify)
    })

    it('should find canny edges', () => {
      const modify = img => img.edges('canny')
      return testSkater('skater-browser-edges-canny.jpg', modify)
    })

    it('should support options', () => {
      const modify = img =>
        img.edges({
          method: 'canny',
          radius: 3,
          blurSigma: 0,
        })
      return testSkater('skater-canny-radius-3.jpg', modify)
    })
  })

  describe('._applyEffects', () => {
    it('should add noise', async () => {
      const modify = img => img.effects([{type: 'noise'}])
      await testSkater('skater-noise.jpg', modify, {strict: false})
    })
  })

  describe('.toAnalysis', () => {
    it('should hash an image', () => {
      return BrowserImage.from(skater)
        .analyze({
          hash: {method: 'phash'},
        })
        .toAnalysis()
        .then(analysis => {
          const result = parseInt(analysis.hash, 2).toString(16)
          expect(result).to.equal('c5b7535fe4cb7000')
        })
    })

    it('should compute sharpness', () => {
      return BrowserImage.from(skater)
        .analyze({
          sharpness: {},
        })
        .toAnalysis()
        .then(analysis => {
          expect(analysis).to.have.property('sharpness')

          const sharpness = analysis.sharpness
          expect(sharpness.percentEdges).to.be.within(0.27, 0.28)
          expect(sharpness.median).to.be.within(74, 76)
          expect(sharpness.average).to.be.within(90, 95)
          expect(sharpness.upperVentileAverage).to.be.within(228, 232)
        })
    })
  })

  describe('.toMetadata', () => {
    it('should compute the metadata of an image', () => {
      return BrowserImage.from(skater)
        .toMetadata()
        .then(metadata => {
          expect(metadata).to.have.property('width', 256)
          expect(metadata).to.have.property('height', 256)
          expect(metadata).to.have.property('aspectRatio', 1)
          expect(metadata).to.have.deep.property('exif.width', 256)
        })
    })

    it('should compute the metadata of a raw image', () => {
      return BrowserImage.from(fixture('source-google.nef'))
        .toMetadata()
        .then(metadata => {
          expect(metadata).to.have.property('width', 4928)
          expect(metadata).to.have.property('height', 3264)
          expect(metadata).to.have.deep.property('exif.fNumber', 7.1)
        })
    }).timeout(5000)

    it('should compute the metadata of a portrait image', () => {
      return BrowserImage.from(yosemite)
        .toMetadata()
        .then(metadata => {
          expect(metadata).to.have.property('width', 1080)
          expect(metadata).to.have.property('height', 1350)
          expect(metadata).to.have.property('aspectRatio', 0.8)
          expect(metadata).to.have.deep.property('exif.width', 1080)
        })
    })
  })

  describe('.toImageData', () => {
    it('should handle RGB image data', () => {
      const pixels = Buffer.from([
        // prettier:ignore
        ...[0, 0, 0, 0, 0, 0],
        ...[0, 0, 0, 0, 0, 0],
      ])

      const imageData = {
        width: 2,
        height: 2,
        channels: 3,
        colorspace: 'rgb',
        data: pixels,
      }

      return BrowserImage.from(imageData)
        .toImageData()
        .then(data => {
          expect(data).to.eql(imageData)
        })
    })

    it('should be fast', () => {
      let promise = Promise.resolve(skater)
      for (let i = 0; i < 100; i++) {
        promise = promise.then(image => BrowserImage.from(image).toImageData())
      }

      return promise.then(imageData => {
        const decoded = ImageData.normalize(jpeg.decode(skater))
        expect(imageData.data.length).to.equal(decoded.data.length)
      })
    })

    it('should generate a valid image data', async () => {
      const imageData = await BrowserImage.from(skater).toImageData()
      const buffer = jpeg.encode(ImageData.toRGBA(imageData), 90).data
      await compareToFixture(buffer, 'skater-image-data.jpg', {strict: false})
    })

    it('should handle rotated image data', async () => {
      const imageData = await BrowserImage.from(skaterRotated).toImageData()
      await compareToFixture(ImageData.toRGBA(imageData), 'skater-rotated.jpg', {strict: false})
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

    it('should handle raw images', () => {
      const image = BrowserImage.from(fixture('source-google.nef'))
      expect(image).to.be.instanceOf(BrowserImage)
      return image
        .resize({
          width: 604,
          height: 400,
          method: ImageResizeMethod.NearestNeighbor,
        })
        .toBuffer()
        .then(buffer => {
          return compareToFixture(buffer, 'google.jpg', {
            strict: false,
            increment: 10,
            tolerance: 30,
          })
        })
    }).timeout(5000)
  })

  describe('Performance', () => {
    let imageData
    function buildImageData({width, height}) {
      const data = new Uint8Array(width * height)
      for (let i = 0; i < data.length; i++) {
        data[i] = 0
      }

      return {width, height, channels: 1, colorspace: 'k', data}
    }

    before(async () => {
      await enableWASM()
      imageData = await fixtureDecode('source-yosemite.jpg')
    })

    after(async () => {
      await disableWASM()
    })

    it('should not be hella slow merging layers', async () => {
      const layerA = buildImageData({width: 3000, height: 3000})
      const layerB = buildImageData({width: 3000, height: 3000})
      const layerC = buildImageData({width: 3000, height: 3000})
      const image = BrowserImage.from(ImageData.toRGBA(layerA))
        .layers([
          {imageData: layerB, opacity: 0.25},
          {imageData: layerC, opacity: 0.25},
        ])

      await image.toImageData()
    }).timeout(5000)

    it('should not be hella slow calibrating', async () => {
      const image = BrowserImage.from(imageData)
        .tone({
          contrast: 0.5,
          whites: 30,
          highlights: -20,
          midtones: 30,
          shadows: 50,
          blacks: -20,
        })
        .calibrate({
          redHueShift: -0.5,
          redSaturationShift: 0.5,
          greenHueShift: 0.5,
          greenSaturationShift: -0.5,
          blueHueShift: 0.5,
          blueSaturationShift: 0.5,
        })

      await image.toImageData()
    }).timeout(20000)

    it('should not be hella slow toning', async () => {
      const image = BrowserImage.from(imageData)
        .tone({
          contrast: 0.5,
          whites: 30,
          highlights: -20,
          midtones: 30,
          shadows: 50,
          blacks: -20,
        })

      await image.toImageData()
    }).timeout(5000)
  })
})
