const jpeg = require('@ouranos/jpeg-js')

const ImageData = require('../lib/image-data').ImageData
const NodeImage = require('../lib/node-image').NodeImage
const {expect, fixture, compareToFixture, testImage} = require('./utils')

const skater = fixture('source-skater.jpg')
const yosemite = fixture('source-yosemite.jpg')
const testSkater = (...args) => testImage(NodeImage, 'source-skater.jpg', ...args)
const testYosemite = (...args) => testImage(NodeImage, 'source-yosemite.jpg', ...args)
const testOpera = (...args) => testImage(NodeImage, 'source-sydney.jpg', ...args)
describe('NodeImage', () => {
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
      return testSkater('skater.png', modify, {strict: false})
    })
  })

  describe('._applyResize', () => {
    it('should support subselect', () => {
      const modify = img => img.resize({
        width: 100,
        height: 80,
        fit: NodeImage.EXACT,
        subselect: {
          top: 200,
          bottom: 800,
          left: 100,
          right: 700,
        },
      }).format({type: 'jpeg', quality: 90})

      return testYosemite('yosemite-subselect.jpg', modify, {strict: false})
    })

    it('should support cover', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        fit: NodeImage.COVER,
      })

      return testYosemite('yosemite-square-cover.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should support contain', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        fit: NodeImage.CONTAIN,
      })

      return testYosemite('yosemite-square-contain.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should support crop', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        fit: NodeImage.CROP,
      })

      return testOpera('opera-square-crop.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should support exact', () => {
      const modify = img => img.resize({
        width: 200,
        height: 200,
        fit: NodeImage.EXACT,
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
      return testYosemite('yosemite-greyscale.jpg', modify, {
        strict: false,
        increment: 5,
        tolerance: 10,
      })
    })
  })

  describe('._applyEdges', () => {
    it('should find sobel edges', () => {
      const modify = img => img.edges()
      return testSkater('skater-edges-sobel.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })

    it('should find canny edges', () => {
      const modify = img => img.edges(NodeImage.CANNY)
      return testSkater('skater-edges-canny.jpg', modify, {
        strict: false,
        tolerance: 25,
      })
    })
  })

  describe('.toAnalysis', () => {
    it('should hash an image', () => {
      return NodeImage.from(skater)
        .analyze({
          hash: {method: NodeImage.PHASH},
        })
        .toAnalysis()
        .then(analysis => {
          const result = Buffer.from(analysis.hash).toString('hex')
          expect(result).to.equal('ea26561bb48918d5')
        })
    })

    it('should compute sharpness', () => {
      return NodeImage.from(skater)
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
      return NodeImage.from(skater)
        .toMetadata()
        .then(metadata => {
          expect(metadata).to.have.property('width', 256)
          expect(metadata).to.have.property('height', 256)
          expect(metadata).to.have.property('aspectRatio', 1)
          expect(metadata).to.have.property('exif')
        })
    })

    it('should compute the metadata of a raw image', () => {
      return NodeImage.from(fixture('source-google.nef'))
        .toMetadata()
        .then(metadata => {
          expect(metadata).to.have.property('width', 4928)
          expect(metadata).to.have.property('height', 3264)
          expect(metadata).to.have.deep.property('exif.fNumber', 7.1)
        })
    })

    it('should compute the metadata of a portrait image', () => {
      return NodeImage.from(yosemite)
        .toMetadata()
        .then(metadata => {
          expect(metadata).to.have.property('width', 1080)
          expect(metadata).to.have.property('height', 1350)
          expect(metadata).to.have.property('aspectRatio', 0.8)
          expect(metadata).to.have.property('exif')
        })
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

    it('should be fast', () => {
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

    it('should generate a valid image data', () => {
      return NodeImage.from(skater).toImageData().then(data => {
        const buffer = jpeg.encode(ImageData.toRGBA(data), 90).data
        return compareToFixture(buffer, 'skater-image-data.jpg', {strict: false})
      })
    })

    it('should generate valid image data for transformed image', () => {
      return NodeImage.from(skater)
        .greyscale()
        .resize({width: 120, height: 120})
        .toImageData()
        .then(imageData => {
          expect(imageData).to.have.property('channels', 1)
          expect(imageData).to.have.property('format', 'k')
          expect(imageData).to.have.property('width', 120)
          expect(imageData).to.have.property('height', 120)
          expect(imageData.data).to.have.length(120 * 120)
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

    it('should handle raw images', () => {
      const image = NodeImage.from(fixture('source-google.nef'))
      expect(image).to.be.instanceOf(NodeImage)
      return image
        .resize({width: 604, height: 400})
        .format({type: 'jpeg', quality: 80})
        .toBuffer()
        .then(buffer => {
          return compareToFixture(buffer, 'google.jpg', {
            strict: false,
            increment: 10,
            tolerance: 30,
          })
        })
    })
  })

  it('should support multiple sequential changes', () => {
    const image = NodeImage.from(fixture('source-google.nef'))
    expect(image).to.be.instanceOf(NodeImage)
    return image
      .resize({width: 604, height: 400})
      .greyscale()
      .edges({method: NodeImage.CANNY, blurSigma: 0})
      .format({type: 'jpeg', quality: 80})
      .toBuffer()
      .then(buffer => {
        return compareToFixture(buffer, 'google-canny.jpg', {
          strict: false,
          increment: 10,
          tolerance: 30,
        })
      })
  })
})
