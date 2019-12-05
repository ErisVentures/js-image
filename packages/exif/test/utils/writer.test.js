const {Writer} = require('../../dist/utils/writer')
const {Endian} = require('../../dist/utils/types')

const toArray = bytes => new Uint8Array(Buffer.from(bytes))

describe('Writer', () => {
  describe('.write', () => {
    it('should write little endian', () => {
      const writer = new Writer()
      writer.setEndianess(Endian.Little)
      writer.write(0xffcc, 2)
      writer.write(0xff, 4)
      expect(writer.toBuffer()).toEqual(toArray([0xcc, 0xff, 0xff, 0, 0, 0]))
    })

    it('should write big endian', () => {
      const writer = new Writer()
      writer.setEndianess(Endian.Big)
      writer.write(0xffcc, 2)
      writer.write(0xff, 4)
      expect(writer.toBuffer()).toEqual(toArray([0xff, 0xcc, 0, 0, 0, 0xff]))
    })

    it('should write after a pre-filled buffer', () => {
      const originalBuffer = Buffer.from([0x11, 0x11])
      const writer = new Writer(originalBuffer)
      writer.setEndianess(Endian.Big)
      writer.write(0xff, 4)
      expect(writer.toBuffer()).toEqual(toArray([0x11, 0x11, 0, 0, 0, 0xff]))
      expect(originalBuffer).toEqual(Buffer.from([0x11, 0x11]))
    })

    it('should directly overwrite storage', () => {
      const originalBuffer = Buffer.from([0x11, 0x11, 0x11, 0x11, 0x11, 0x11])
      const writer = new Writer(originalBuffer, {dangerouslyAvoidCopy: true})
      writer.setEndianess(Endian.Big)
      writer.write(0xff, 4)
      expect(writer.toBuffer()).toEqual(toArray([0, 0, 0, 0xff, 0x11, 0x11]))
      expect(originalBuffer).toEqual(Buffer.from([0, 0, 0, 0xff, 0x11, 0x11]));
    })
  })

  describe('#spliceBufferRange', () => {
    it('should replace the range with a new buffer', () => {
      const start = Buffer.from([0xff, 0xff, 0xff, 0xff])
      const replacement = Buffer.from([0x11])
      expect(Writer.spliceBufferRange(start, replacement, 0, 1)).toEqual(
        Buffer.from([0x11, 0xff, 0xff, 0xff]),
      )
      expect(Writer.spliceBufferRange(start, replacement, 1, 2)).toEqual(
        Buffer.from([0xff, 0x11, 0xff, 0xff]),
      )
      expect(Writer.spliceBufferRange(start, replacement, 1, 3)).toEqual(
        Buffer.from([0xff, 0x11, 0xff]),
      )
    })
  })
})
