const parse = require('../../dist/index').parse
const Decoder = require('../../dist/decoder/fuji-decoder').FujiDecoder
const {fixture, compareToFixture} = require('../utils')

describe('Decoder', () => {
  describe('.extractJPEG', () => {
    it('should extract the fuji thumbnail', () => {
      const decoder = new Decoder(fixture('fuji-xt10.raf'))
      const thumbnail = decoder.extractJPEG()
      compareToFixture(thumbnail, 'fuji-xt10.jpg')
    })
  })

  describe('.extractMetadata', () => {
    it('should extract metadata', () => {
      const decoder = new Decoder(fixture('fuji-xt10.raf'))
      const metadata = decoder.extractMetadata()
      expect(metadata).toMatchObject({
        FocalLength: 18,
        FocalLengthIn35mmFormat: 27,
        ISO: 1600,
        ImageLength: 1280,
        ImageWidth: 1920,
        LensMake: 'FUJIFILM',
        LensModel: 'XF18-55mmF2.8-4 R LM OIS',
        Make: 'FUJIFILM',
        Model: 'X-T10',
      })
    })
  })
})
