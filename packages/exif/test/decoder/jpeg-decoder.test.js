const {fixture} = require('../utils')
const JPEGDecoder = require('../../dist/decoder/jpeg-decoder').JPEGDecoder
const XMPEncoder = require('../../dist/encoder/xmp-encoder').XMPEncoder

const xmpJpeg = fixture('xmp.jpg')
const nikonJpeg = fixture('nikon.jpg')

describe('lib/decoder/jpeg-decoder.js', () => {
  describe('#injectEXIFMetadata', () => {
    it('should reconstruct same image', () => {
      const metadataBuffer = new JPEGDecoder(nikonJpeg).extractEXIFBuffer()
      const result = JPEGDecoder.injectEXIFMetadata(nikonJpeg, metadataBuffer)
      expect(result).toEqual(nikonJpeg)
    })
  })

  describe('#injectXMPMetadata', () => {
    it('should reconstruct same image', () => {
      const metadataBuffer = new JPEGDecoder(xmpJpeg).extractXMPBuffer()
      const result = JPEGDecoder.injectXMPMetadata(xmpJpeg, metadataBuffer)
      expect(result).toEqual(xmpJpeg)
    })

    it('should inject from scratch', () => {
      const metadataBuffer = XMPEncoder.encode({Rating: 1, Label: 'Red'})
      const result = JPEGDecoder.injectXMPMetadata(nikonJpeg, metadataBuffer)
      const metadata = new JPEGDecoder(result).extractMetadata()
      expect(metadata).toMatchObject({Rating: 1, Label: 'Red'})
    })
  })

  describe('.extractMetadata', () => {
    it('should extract EXIF data', () => {
      const metadata = new JPEGDecoder(nikonJpeg).extractMetadata()
      expect(metadata).toMatchObject({ISO: 2500})
    })

    it('should extract XMP data', () => {
      const metadata = new JPEGDecoder(xmpJpeg).extractMetadata()
      expect(metadata).toMatchObject({Rating: 4, Label: 'Blue'})
    })
  })
})
