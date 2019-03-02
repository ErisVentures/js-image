const {expect} = require('../utils')
const XMPEncoder = require('../../dist/encoder/xmp-encoder').XMPEncoder
const XMPDecoder = require('../../dist/decoder/xmp-decoder').XMPDecoder

describe('lib/encoders/xmp-encoder.js', () => {
  const DCSubjectBagOfWords = JSON.stringify(['foo', 'spaced-key word'])

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
      const xmpAugmented = XMPEncoder.encode({Label: 'Red', DCSubjectBagOfWords}, xmp)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).to.eql({
        Rating: 3,
        Label: 'Red',
        DCSubjectBagOfWords,
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

    it('should delete XMP keys', () => {
      const xmp = XMPEncoder.encode({Rating: 3, Label: 'Red', DCSubjectBagOfWords})
      const xmpAugmented = XMPEncoder.encode(
        {Rating: undefined, DCSubjectBagOfWords: undefined},
        xmp,
      )
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).to.eql({
        Label: 'Red',
      })
    })

    it('should roundtrip with no impact', () => {
      const xmpOriginal = XMPEncoder.wrapInPacket(XMPEncoder.encode({Rating: 3}))
      const xmpAfter = XMPEncoder.encode({Label: 'Red', DCSubjectBagOfWords}, xmpOriginal)
      const xmpRemoved = XMPEncoder.encode(
        {Label: undefined, DCSubjectBagOfWords: undefined},
        xmpAfter,
      )

      const truncatePacketEnd = xmp => xmp.toString().replace(/\s+<\?xpacket end.*$/, '')
      expect(xmpOriginal.length).to.equal(xmpRemoved.length)
      expect(truncatePacketEnd(xmpOriginal)).to.eql(truncatePacketEnd(xmpRemoved))
    })

    it('should handle existing XMP wrapped in packet', () => {
      const xmp = XMPEncoder.wrapInPacket(XMPEncoder.encode({Rating: 3, DCSubjectBagOfWords}))
      const xmpAugmented = XMPEncoder.encode({Label: 'Red', Rating: undefined}, xmp)
      expect(xmpAugmented.length).to.eql(xmp.length)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).to.eql({
        Label: 'Red',
        DCSubjectBagOfWords,
      })
    })
  })
})
