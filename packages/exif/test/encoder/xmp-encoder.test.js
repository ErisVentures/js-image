const xmlParser = require('fast-xml-parser')
const XMPEncoder = require('../../dist/encoder/xmp-encoder').XMPEncoder
const XMPDecoder = require('../../dist/decoder/xmp-decoder').XMPDecoder

const xmpElementBased = `
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 5.6.0">
   <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about=""
            xmlns:xmp="http://ns.adobe.com/xap/1.0/"
            xmlns:MicrosoftPhoto="http://ns.microsoft.com/photo/1.0/">
         <xmp:Rating>1</xmp:Rating>
         <xmp:Label/>
         <exif:DateTimeOriginal>2017:03:16 02:25:25</exif:DateTimeOriginal>
         <MicrosoftPhoto:Rating>1</MicrosoftPhoto:Rating>
      </rdf:Description>
   </rdf:RDF>
</x:xmpmeta>
`

describe('lib/encoders/xmp-encoder.js', () => {
  const DateTimeOriginal = '2019-12-04T12:01:48.291'
  const DCSubjectBagOfWords = JSON.stringify(['foo', 'spaced-key word'])

  describe('#encode', () => {
    it('should create a valid XMP file', () => {
      const metadata = {
        Rating: 4,
        Label: 'Blue',
        DateTimeOriginal,
      }

      const xmp = XMPEncoder.encode(metadata)

      expect(xmlParser.validate(xmp.toString())).toBe(true)
      expect(xmp.toString()).toContain('xmp:Rating=')
      expect(xmp.toString()).toContain('xmp:Label=')
      expect(xmp.toString()).toContain('exif:DateTimeOriginal=')

      const decoder = new XMPDecoder(xmp)
      expect(decoder.extractMetadata()).toEqual(metadata)
    })

    it('should augment an existing attribute-based XMP file', () => {
      const xmp = XMPEncoder.encode({Rating: 3, DateTimeOriginal})
      const xmpAugmented = XMPEncoder.encode({Label: 'Red', DCSubjectBagOfWords}, xmp)

      expect(xmlParser.validate(xmpAugmented.toString())).toBe(true)
      expect(xmpAugmented.toString()).toContain('xmp:Rating=')
      expect(xmpAugmented.toString()).toContain('xmp:Label=')
      expect(xmpAugmented.toString()).toContain('exif:DateTimeOriginal=')
      expect(xmpAugmented.toString()).toContain('<dc:subject>')

      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Rating: 3,
        Label: 'Red',
        DateTimeOriginal,
        DCSubjectBagOfWords,
      })
    })

    it('should augment an existing element-based XMP file', () => {
      const xmpAugmented = XMPEncoder.encode(
        {Label: 'Red', DateTimeOriginal, DCSubjectBagOfWords},
        xmpElementBased,
      )

      expect(xmlParser.validate(xmpAugmented.toString())).toBe(true)
      expect(xmpAugmented.toString()).toContain('<xmp:Rating>')
      expect(xmpAugmented.toString()).toContain('<xmp:Label>')
      expect(xmpAugmented.toString()).toContain('<exif:DateTimeOriginal>')
      expect(xmpAugmented.toString()).toContain('<dc:subject>')

      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Rating: 1,
        Label: 'Red',
        DateTimeOriginal,
        DCSubjectBagOfWords,
      })
    })

    it('should overwrite an existing attribute-based XMP file', () => {
      const xmp = XMPEncoder.encode({Rating: 3, DateTimeOriginal})
      const xmpAugmented = XMPEncoder.encode({Rating: 2, Label: 'Red'}, xmp)

      expect(xmlParser.validate(xmpAugmented.toString())).toBe(true)

      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Rating: 2,
        Label: 'Red',
        DateTimeOriginal,
      })
    })

    it('should overwrite an existing element-based XMP file', () => {
      const xmpAugmented = XMPEncoder.encode(
        {Rating: 2, Label: 'Red', DateTimeOriginal},
        xmpElementBased,
      )

      expect(xmlParser.validate(xmpAugmented.toString())).toBe(true)
      expect(xmpAugmented.toString()).toContain('<xmp:Rating>')
      expect(xmpAugmented.toString()).toContain('<xmp:Label>')
      expect(xmpAugmented.toString()).toContain('<exif:DateTimeOriginal>')
      expect(xmpAugmented.toString()).not.toContain('xmp:Rating=')
      expect(xmpAugmented.toString()).not.toContain('xmp:Label=')
      expect(xmpAugmented.toString()).not.toContain('exif:DateTimeOriginal=')

      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Rating: 2,
        Label: 'Red',
        DateTimeOriginal,
      })
    })

    it('should delete XMP attributes', () => {
      const xmp = XMPEncoder.encode({
        Rating: 3,
        Label: 'Red',
        DateTimeOriginal,
        DCSubjectBagOfWords,
      })
      const xmpAugmented = XMPEncoder.encode(
        {Rating: undefined, DCSubjectBagOfWords: undefined, DateTimeOriginal: undefined},
        xmp,
      )

      expect(xmlParser.validate(xmpAugmented.toString())).toBe(true)
      expect(xmpAugmented.toString()).not.toContain('xmp:Rating=')
      expect(xmpAugmented.toString()).not.toContain('exif:DateTimeOriginal=')
      expect(xmpAugmented.toString()).not.toContain('<dc:subject>')

      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({
        Label: 'Red',
      })
    })

    it('should delete XMP elements', () => {
      const xmpAugmented = XMPEncoder.encode(
        {Rating: undefined, DateTimeOriginal: undefined},
        xmpElementBased,
      )

      expect(xmlParser.validate(xmpAugmented.toString())).toBe(true)
      expect(xmpAugmented.toString()).not.toContain('<xmp:Rating>')
      expect(xmpAugmented.toString()).not.toContain('<exif:DateTimeOriginal>')
      expect(xmpAugmented.toString()).not.toContain('<dc:subject>')

      const decoder = new XMPDecoder(xmpAugmented)
      expect(decoder.extractMetadata()).toEqual({})
    })

    it('should roundtrip with no impact', () => {
      const xmpOriginal = XMPEncoder.wrapInPacket(XMPEncoder.encode({Rating: 3}))
      const xmpAfter = XMPEncoder.encode(
        {Label: 'Red', DCSubjectBagOfWords, DateTimeOriginal},
        xmpOriginal,
      )
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
