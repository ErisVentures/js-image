const {expect} = require('../utils')
const {Writer} = require('../../dist/utils/writer')
const {Endian} = require('../../dist/utils/types')

describe('Writer', () => {
  describe('.write', () => {
    it('should write little endian', () => {
      const writer = new Writer()
      writer.setEndianess(Endian.Little)
      writer.write(0xffcc, 2)
      writer.write(0xff, 4)
      expect(writer.toBuffer()).to.eql(Buffer.from([0xcc, 0xff, 0xff, 0, 0, 0]))
    })

    it('should write big endian', () => {
      const writer = new Writer()
      writer.setEndianess(Endian.Big)
      writer.write(0xffcc, 2)
      writer.write(0xff, 4)
      expect(writer.toBuffer()).to.eql(Buffer.from([0xff, 0xcc, 0, 0, 0, 0xff]))
    })
  })
})
