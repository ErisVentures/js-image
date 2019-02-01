const {expect} = require('../utils')
const XMPEncoder = require('../../dist/encoder/xmp-encoder').XMPEncoder
const XMPDecoder = require('../../dist/decoder/xmp-decoder').XMPDecoder

describe('lib/encoders/xmp-encoder.js', () => {
  describe('#encode', () => {
    it('should create a valid XMP file', () => {
      const metadata = {
        Rating: 4,
        Label: 'Blue',
      }

      const xmp = XMPEncoder.encode(metadata)
      const decoder = new XMPDecoder(xmp)
      expect(decoder.extractMetadata()).to.eql(metadata)
    })

    it('should augment an existing XMP file', () => {
      const xmp = XMPEncoder.encode({Rating: 3})
      const xmpAugmented = XMPEncoder.encode({Label: 'Red'}, xmp)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).to.eql({
        Rating: 3,
        Label: 'Red',
      })
    })

    it('should overwrite an existing XMP file', () => {
      const xmp = XMPEncoder.encode({Rating: 3})
      const xmpAugmented = XMPEncoder.encode({Rating: 2, Label: 'Red'}, xmp)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).to.eql({
        Rating: 2,
        Label: 'Red',
      })
    })

    it('should handle existing XMP wrapped in packet', () => {
      const xmp = XMPEncoder.wrapInPacket(XMPEncoder.encode({Rating: 3}))
      const xmpAugmented = XMPEncoder.encode({Label: 'Red'}, xmp)
      expect(xmpAugmented.length).to.eql(xmp.length)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).to.eql({
        Rating: 3,
        Label: 'Red',
      })
    })
  })
})
