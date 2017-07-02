const {Endian, Reader} = require('../dist/reader')
const {expect} = require('./utils')

describe('Reader', () => {
  describe('.read', () => {
    context('when reading from Buffer', () => {
      const buffer = Buffer.from([0x01, 0x00, 0x00, 0x10])

      it('should read little endian', () => {
        const reader = new Reader(buffer)
        reader.setEndianess(Endian.Little)
        expect(reader.read(2)).to.equal(1)
        expect(reader.read(2)).to.equal(4096)
      })

      it('should read big endian', () => {
        const reader = new Reader(buffer)
        reader.setEndianess(Endian.Big)
        expect(reader.read(2)).to.equal(256)
        expect(reader.read(2)).to.equal(16)
      })
    })

    context('when reading from Uint8Array', () => {
      const array = new Uint8Array([0x01, 0x00, 0x00, 0x10])

      it('should read little endian', () => {
        const reader = new Reader(array)
        reader.setEndianess(Endian.Little)
        expect(reader.read(2)).to.equal(1)
        expect(reader.read(2)).to.equal(4096)
      })

      it('should read big endian', () => {
        const reader = new Reader(array)
        reader.setEndianess(Endian.Big)
        expect(reader.read(2)).to.equal(256)
        expect(reader.read(2)).to.equal(16)
      })
    })
  })
})
