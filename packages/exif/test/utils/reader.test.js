const {Reader} = require('../../dist/utils/reader')
const {Endian} = require('../../dist/utils/types')

describe('Reader', () => {
  describe('.read', () => {
    describe('when reading from Buffer', () => {
      const buffer = Buffer.from([0x01, 0x00, 0x00, 0x10])

      it('should read little endian', () => {
        const reader = new Reader(buffer)
        reader.setEndianess(Endian.Little)
        expect(reader.read(2)).toBe(1)
        expect(reader.read(2)).toBe(4096)
      })

      it('should read big endian', () => {
        const reader = new Reader(buffer)
        reader.setEndianess(Endian.Big)
        expect(reader.read(2)).toBe(256)
        expect(reader.read(2)).toBe(16)
      })
    })

    describe('when reading from Uint8Array', () => {
      const array = new Uint8Array([0x01, 0x00, 0x00, 0x10])

      it('should read little endian', () => {
        const reader = new Reader(array)
        reader.setEndianess(Endian.Little)
        expect(reader.read(2)).toBe(1)
        expect(reader.read(2)).toBe(4096)
      })

      it('should read big endian', () => {
        const reader = new Reader(array)
        reader.setEndianess(Endian.Big)
        expect(reader.read(2)).toBe(256)
        expect(reader.read(2)).toBe(16)
      })
    })
  })

  describe('.readAsHex', () => {
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x10])

    it('should read little endian', () => {
      const reader = new Reader(buffer)
      reader.setEndianess(Endian.Little)
      expect(reader.readAsHex(2)).toBe('0001')
      expect(reader.readAsHex(2)).toBe('1000')
    })

    it('should read big endian', () => {
      const reader = new Reader(buffer)
      reader.setEndianess(Endian.Big)
      expect(reader.readAsHex(2)).toBe('0100')
      expect(reader.readAsHex(2)).toBe('0010')
    })

    it('should read large hex strings', () => {
      const reader = new Reader([
        0xff,
        0xdd,
        0xcc,
        0xbb,
        0xaa,
        0x99,
        0x88,
        0x77,
        0x66,
        0x55,
        0x44,
        0x33,
        0x22,
        0x11,
        0x00,
        0xf0,
      ])

      reader.setEndianess(Endian.Big)
      reader.seek(0)
      expect(reader.readAsHex(16)).toBe('ffddccbbaa99887766554433221100f0')
      reader.setEndianess(Endian.Little)
      reader.seek(0)
      expect(reader.readAsHex(16)).toBe('f000112233445566778899aabbccddff')
    })
  })
})
