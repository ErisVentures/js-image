const JPEG = require('jpeg-js')
const parse = require('../../dist/index').parse
const Decoder = require('../../dist/decoder/tiff-decoder').TIFFDecoder
const {fixture, compareToFixture} = require('../utils')

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
      expect(parse(thumbnail)).toMatchObject({width: 1616, height: 1080})
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

    it('should extract a panasonic jpeg', () => {
      const decoder = new Decoder(fixture('gh4.rw2'))
      const thumbnail = decoder.extractJPEG()
      parse(thumbnail) // make sure we can parse it
      compareToFixture(thumbnail, 'gh4.jpg')
    })

    it('should create a valid JPEG', () => {
      const decoder = new Decoder(fixture('gh4.rw2'))
      const thumbnail = decoder.extractJPEG()
      JPEG.decode(thumbnail)
    }, 20000)
  })

  describe('.extractMetadata', () => {
    it('should extract d4s metadata', () => {
      const decoder = new Decoder(fixture('d4s.nef'))
      const metadata = decoder.extractMetadata()
      expect(metadata).toHaveProperty('Make', 'NIKON CORPORATION')
      expect(metadata).toHaveProperty('Model', 'NIKON D4S')
      expect(metadata).toHaveProperty('ImageWidth', 4936)
      expect(metadata).toHaveProperty('ImageLength', 3288)
      expect(metadata).toHaveProperty('ISO', 160)
      expect(metadata).toHaveProperty('FNumber', 2.8)
      expect(metadata).toHaveProperty('ExposureTime', 0.0125)
    })
  })
})
