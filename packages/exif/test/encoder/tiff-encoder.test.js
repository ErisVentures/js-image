const {expect} = require('../utils')
const TIFFEncoder = require('../../dist/encoder/tiff-encoder').TIFFEncoder
const TIFFDecoder = require('../../dist/decoder/tiff-decoder').TIFFDecoder

describe('lib/encoders/tiff-encoder.js', () => {
  describe('#encode', () => {
    it('should create a valid TIFF', () => {
      const metadata = {
        Orientation: 1,
        ImageWidth: 4936,
        ImageHeight: 3288,
        ISO: 160,
      }

      const tiff = TIFFEncoder.encode(metadata)
      const decoder = new TIFFDecoder(tiff)
      expect(decoder.extractMetadata()).to.eql(metadata)
    })
  })
})
