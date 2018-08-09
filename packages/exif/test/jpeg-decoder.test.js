const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const JPEGDecoder = require('../lib/jpeg-decoder')

const fixture = filePath => fs.readFileSync(path.join(__dirname, 'fixtures', filePath))

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
