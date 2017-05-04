const fs = require('fs')
const Decoder = require('../lib/decoder')
const {fixture, compareToFixture} = require('./utils')

describe('Decoder', function () {
  describe('.extractThumbnail', function () {
    it('should extract the d4s thumbnail', function () {
      const decoder = new Decoder(fixture('d4s.nef'))
      const thumbnail = decoder.extractThumbnail()
      compareToFixture(thumbnail, 'd4s.jpg')
    })

    it('should extract the d610 thumbnail', function () {
      const decoder = new Decoder(fixture('d610.nef'))
      const thumbnail = decoder.extractThumbnail()
      compareToFixture(thumbnail, 'd610.jpg')
    })
  })
})
