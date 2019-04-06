const JPEG = require('jpeg-js')
const parse = require('../../dist/index').parse
const Decoder = require('../../dist/decoder/tiff-decoder').TIFFDecoder
const {expect, fixture, compareToFixture} = require('../utils')

describe('Decoder', () => {
  describe('.extractJPEG', () => {
    it('should extract the canon thumbnail', () => {
      const decoder = new Decoder(fixture('1000d.cr2'))
      const thumbnail = decoder.extractJPEG()
      compareToFixture(thumbnail, '1000d.jpg')
    })

    it('should extract the sony thumbnail', () => {
      const decoder = new Decoder(fixture('a7rii.arw'))
      const thumbnail = decoder.extractJPEG()
      compareToFixture(thumbnail, 'a7rii.jpg')
    })

    it('should have correct width/height for the JPEG', () => {
      const decoder = new Decoder(fixture('a7rii.arw'))
      const thumbnail = decoder.extractJPEG()
      expect(parse(thumbnail)).to.include({width: 1616, height: 1080})
    })

    it('should extract the d4s thumbnail', () => {
      const decoder = new Decoder(fixture('d4s.nef'))
      const thumbnail = decoder.extractJPEG({skipMetadata: true})
      compareToFixture(thumbnail, 'd4s.jpg')
    })

    it('should extract the d610 thumbnail', () => {
      const decoder = new Decoder(fixture('d610.nef'))
      const thumbnail = decoder.extractJPEG({skipMetadata: true})
      compareToFixture(thumbnail, 'd610.jpg')
    })

    it('should extract the iphone thumbnail', () => {
      const decoder = new Decoder(fixture('iphone.dng'))
      const thumbnail = decoder.extractJPEG()
      compareToFixture(thumbnail, 'iphone.jpg')
    })

    it('should create a valid JPEG', () => {
      const decoder = new Decoder(fixture('d610.nef'))
      const thumbnail = decoder.extractJPEG()
      JPEG.decode(thumbnail)
    }, 20000)
  })

  describe('.extractMetadata', () => {
    it('should extract d4s metadata', () => {
      const decoder = new Decoder(fixture('d4s.nef'))
      const metadata = decoder.extractMetadata()
      expect(metadata).to.have.property('Make', 'NIKON CORPORATION')
      expect(metadata).to.have.property('Model', 'NIKON D4S')
      expect(metadata).to.have.property('ImageWidth', 4936)
      expect(metadata).to.have.property('ImageLength', 3288)
      expect(metadata).to.have.property('ISO', 160)
      expect(metadata).to.have.property('FNumber', 2.8)
      expect(metadata).to.have.property('ExposureTime', 0.0125)
    })
  })
})
