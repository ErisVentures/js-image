import {fixture} from '../utils'
import {JPEGDecoder} from '../../lib/decoder/jpeg-decoder'
import {TIFFDecoder} from '../../lib/decoder/tiff-decoder'
import {IFDEntry} from '../../lib/decoder/ifd-entry'
import {XMPEncoder} from '../../lib/encoder/xmp-encoder'

const xmpJpeg = fixture('xmp.jpg')
const nikonJpeg = fixture('nikon.jpg')

describe('lib/decoder/jpeg-decoder.js', () => {
  describe('#injectEXIFMetadata', () => {
    it('should reconstruct same image', () => {
      const metadataBuffer = new JPEGDecoder(nikonJpeg).extractEXIFBuffer()
      const result = JPEGDecoder.injectEXIFMetadata(nikonJpeg, metadataBuffer)
      expect(result).toEqual(nikonJpeg)
    })

    it('should replace some data', () => {
      const decoder = new JPEGDecoder(nikonJpeg)
      const metadata = decoder.extractMetadata()
      const metadataBuffer = decoder.extractEXIFBuffer()
      const replaced = TIFFDecoder.replaceIFDEntry(
        new TIFFDecoder(metadataBuffer),
        'DateTimeOriginal',
        Buffer.from('2019-12-04T22:01:15'),
      )
      const result = JPEGDecoder.injectEXIFMetadata(nikonJpeg, replaced)

      const newMetadata = new JPEGDecoder(result).extractMetadata()
      expect(newMetadata).toEqual({
        ...metadata,
        DateTimeOriginal: '2019-12-04T22:01:15',
      })
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
