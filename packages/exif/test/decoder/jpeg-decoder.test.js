const {expect, fixture} = require('../utils')
const JPEGDecoder = require('../../dist/decoder/jpeg-decoder').JPEGDecoder

const nikonJpeg = fixture('nikon.jpg')

describe('lib/jpeg-decoder.js', () => {
  describe('#injectMetadata', () => {
    it('should reconstruct same image', () => {
      const metadataBuffer = new JPEGDecoder(nikonJpeg).extractMetadataBuffer()
      const result = JPEGDecoder.injectMetadata(nikonJpeg, metadataBuffer)
      expect(result).to.eql(nikonJpeg)
    })
  })
})
