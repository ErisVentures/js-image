const JPEG = require('jpeg-js')
const Decoder = require('../../dist/decoder/tiff-decoder').TIFFDecoder
const {expect, fixture, compareToFixture} = require('../utils')

describe('Decoder', () => {
  describe('.extractJPEG', () => {
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

    it('should create a valid JPEG', () => {
      const decoder = new Decoder(fixture('d610.nef'))
      const thumbnail = decoder.extractJPEG()
      JPEG.decode(thumbnail)
    }).timeout(20000)
  })

  describe('.extractMetadata', () => {
    it('should extract d4s metadata', () => {
      const decoder = new Decoder(fixture('d4s.nef'))
      const metadata = decoder.extractMetadata()
      expect(metadata).to.have.property('Make', 'NIKON CORPORATION')
      expect(metadata).to.have.property('Model', 'NIKON D4S')
      expect(metadata).to.have.property('ImageWidth', 4936)
      expect(metadata).to.have.property('ImageHeight', 3288)
      expect(metadata).to.have.property('ISO', 160)
      expect(metadata).to.have.property('FNumber', 2.8)
      expect(metadata).to.have.property('ExposureTime', 0.0125)
    })
  })
})
