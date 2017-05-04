const LITTLE_ENDIAN = 'little'
const BIG_ENDIAN = 'big'

class Reader {
  constructor(buffer, position = 0, endian = BIG_ENDIAN) {
    this._buffer = buffer
    this._position = position
    this._endianness = endian
  }

  hasNext() {
    return this._position < this._buffer.length
  }

  getPosition() {
    return this._position
  }

  setEndianess(endian) {
    this._endianness = endian
  }

  read(length) {
    const value = this._endianness === LITTLE_ENDIAN ?
      this._buffer.readUIntLE(this._position, length) :
      this._buffer.readUIntBE(this._position, length)
    this._position += length
    return value
  }

  readAsBuffer(length) {
    const value = this._buffer.slice(this._position, this._position + length)
    this._position += length
    return value
  }

  readAsReader(length) {
    return new Reader(this.readAsBuffer(length), 0, this._endianness)
  }

  skip(diff) {
    this._position = this._position + diff
  }

  seek(position) {
    this._position = position
  }

  use(func) {
    const position = this._position
    const value = func()
    this._position = position
    return value
  }
}

Reader.LITTLE_ENDIAN = LITTLE_ENDIAN
Reader.BIG_ENDIAN = BIG_ENDIAN

module.exports = Reader
