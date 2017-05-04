const Decoder = require('../dist/decoder').Decoder
const {fixture, compareToFixture} = require('./utils')

describe('Decoder', () => {
  describe('.extractThumbnail', () => {
    it('should extract the d4s thumbnail', () => {
      const decoder = new Decoder(fixture('d4s.nef'))
      const thumbnail = decoder.extractThumbnail()
      compareToFixture(thumbnail, 'd4s.jpg')
    })

    it('should extract the d610 thumbnail', () => {
      const decoder = new Decoder(fixture('d610.nef'))
      const thumbnail = decoder.extractThumbnail()
      compareToFixture(thumbnail, 'd610.jpg')
    })
  })
})
