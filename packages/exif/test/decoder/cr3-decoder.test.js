const parse = require('../../dist/index').parse
const Decoder = require('../../dist/decoder/cr3-decoder').Cr3Decoder
const {fixture, compareToFixture} = require('../utils')

describe('Decoder', () => {
  describe('.extractJPEG', () => {
    it('should extract the preview', () => {
      const decoder = new Decoder(fixture('m50.cr3'))
      const jpeg = decoder.extractJPEG()
      compareToFixture(jpeg, 'm50.jpg')
    })
  })

  describe('.extractMetadata', () => {
    it('should extract metadata', () => {
      const decoder = new Decoder(fixture('m50.cr3'))
      const metadata = decoder.extractMetadata()
      expect(metadata).toMatchObject({
        DateTimeOriginal: '2018:03:30 14:38:06',
        FocalLength: 15,
        ISO: 100,
        ImageLength: 4000,
        ImageWidth: 6000,
        LensModel: 'EF-M15-45mm f/3.5-6.3 IS STM',
        Make: 'Canon',
        Model: 'Canon EOS M50',
      })
    })
  })
})
