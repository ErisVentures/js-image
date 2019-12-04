const XMPEncoder = require('../../dist/encoder/xmp-encoder').XMPEncoder
const XMPDecoder = require('../../dist/decoder/xmp-decoder').XMPDecoder

describe('lib/encoders/xmp-encoder.js', () => {
  const DateTimeOriginal = '2019-12-04T12:01:48.291';
  const DCSubjectBagOfWords = JSON.stringify(['foo', 'spaced-key word'])

  describe('#encode', () => {
    it('should create a valid XMP file', () => {
      const metadata = {
        Rating: 4,
        Label: 'Blue',
        DateTimeOriginal,
      }

      const xmp = XMPEncoder.encode(metadata)
      const decoder = new XMPDecoder(xmp)
      expect(decoder.extractMetadata()).toEqual(metadata)
      expect(xmp.toString()).toContain('xmp:Rating')
      expect(xmp.toString()).toContain('xmp:Label')
      expect(xmp.toString()).toContain('exif:DateTimeOriginal')
    })

    it('should augment an existing XMP file', () => {
      const xmp = XMPEncoder.encode({Rating: 3, DateTimeOriginal})
      const xmpAugmented = XMPEncoder.encode({Label: 'Red', DCSubjectBagOfWords}, xmp)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Rating: 3,
        Label: 'Red',
        DateTimeOriginal,
        DCSubjectBagOfWords,
      })
      expect(xmpAugmented.toString()).toContain('xmp:Rating')
      expect(xmpAugmented.toString()).toContain('xmp:Label')
      expect(xmpAugmented.toString()).toContain('exif:DateTimeOriginal')
      expect(xmpAugmented.toString()).toContain('dc:subject')
    })

    it('should overwrite an existing XMP file', () => {
      const xmp = XMPEncoder.encode({Rating: 3, DateTimeOriginal})
      const xmpAugmented = XMPEncoder.encode({Rating: 2, Label: 'Red'}, xmp)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Rating: 2,
        Label: 'Red',
        DateTimeOriginal,
      })
    })

    it('should delete XMP keys', () => {
      const xmp = XMPEncoder.encode({Rating: 3, Label: 'Red', DateTimeOriginal, DCSubjectBagOfWords})
      const xmpAugmented = XMPEncoder.encode(
        {Rating: undefined, DCSubjectBagOfWords: undefined, DateTimeOriginal: undefined},
        xmp,
      )
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Label: 'Red',
      })
    })

    it('should roundtrip with no impact', () => {
      const xmpOriginal = XMPEncoder.wrapInPacket(XMPEncoder.encode({Rating: 3}))
      const xmpAfter = XMPEncoder.encode({Label: 'Red', DCSubjectBagOfWords, DateTimeOriginal}, xmpOriginal)
      const xmpRemoved = XMPEncoder.encode(
        {Label: undefined, DCSubjectBagOfWords: undefined, DateTimeOriginal: undefined},
        xmpAfter,
      )

      const truncatePacketEnd = xmp => xmp.toString().replace(/\s+<\?xpacket end.*$/, '')
      expect(xmpOriginal.length).toBe(xmpRemoved.length)
      expect(truncatePacketEnd(xmpOriginal)).toEqual(truncatePacketEnd(xmpRemoved))
    })

    it('should handle existing XMP wrapped in packet', () => {
      const xmp = XMPEncoder.wrapInPacket(XMPEncoder.encode({Rating: 3, DCSubjectBagOfWords}))
      const xmpAugmented = XMPEncoder.encode({Label: 'Red', Rating: undefined}, xmp)
      expect(xmpAugmented.length).toEqual(xmp.length)
      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Label: 'Red',
        DCSubjectBagOfWords,
      })
    })
  })
})
