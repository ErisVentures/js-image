const jpeg = require('jpeg-js')

const {ImageResizeMethod} = require('../dist/types')
const ImageData = require('../dist/image-data').ImageData
const BrowserImage = require('../dist/browser-image').BrowserImage
const {expect, fixture, fixtureDecode, compareToFixture, testImage, enableWASM, disableWASM} = require('./utils')

const skater = fixture('source-skater.jpg')
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

    it('should generate a valid image data', () => {
      const decoded = jpeg.decode(skater)
      return BrowserImage.from(skater)
        .toImageData()
        .then(imageData => {
          expect(imageData).to.have.property('width', decoded.width)
          expect(imageData).to.have.property('height', decoded.height)
          expect(imageData)
            .to.have.property('data')
            .with.length(decoded.data.length)
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
    before(async () => {
      await enableWASM()
    })

    after(async () => {
      await disableWASM()
    })

    it('should not be hella slow', async () => {
      const imageData = await fixtureDecode('source-yosemite.jpg')
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
  })
})
