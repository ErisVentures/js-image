const {expect, fixture} = require('../utils')
const JPEGDecoder = require('../../dist/decoder/jpeg-decoder').JPEGDecoder
const XMPEncoder = require('../../dist/encoder/xmp-encoder').XMPEncoder

const xmpJpeg = fixture('xmp.jpg')
const nikonJpeg = fixture('nikon.jpg')

describe('lib/decoder/jpeg-decoder.js', () => {
  describe('#injectEXIFMetadata', () => {
    it('should reconstruct same image', () => {
      const metadataBuffer = new JPEGDecoder(nikonJpeg).extractEXIFBuffer()
      const result = JPEGDecoder.injectEXIFMetadata(nikonJpeg, metadataBuffer)
      expect(result).to.eql(nikonJpeg)
    })
  })

  describe('#injectXMPMetadata', () => {
    it('should reconstruct same image', () => {
      const metadataBuffer = new JPEGDecoder(xmpJpeg).extractXMPBuffer()
      const result = JPEGDecoder.injectXMPMetadata(xmpJpeg, metadataBuffer)
      expect(result).to.eql(xmpJpeg)
    })

    it('should inject from scratch', () => {
      const metadataBuffer = XMPEncoder.encode({Rating: 1, Label: 'Red'})
      const result = JPEGDecoder.injectXMPMetadata(nikonJpeg, metadataBuffer)
      const metadata = new JPEGDecoder(result).extractMetadata()
      expect(metadata).to.include({Rating: 1, Label: 'Red'})
    })
  })

  describe('.extractMetadata', () => {
    it('should extract EXIF data', () => {
      const metadata = new JPEGDecoder(nikonJpeg).extractMetadata()
      expect(metadata).to.include({ISO: 2500})
    })

    it('should extract XMP data', () => {
      const metadata = new JPEGDecoder(xmpJpeg).extractMetadata()
      expect(metadata).to.include({Rating: 4, Label: 'Blue'})
    })
  })
})
