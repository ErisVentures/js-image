const _ = require('lodash')
const debug = require('debug')('raw-decoder:decoder')
const Reader = require('./reader')
const IfdParser = require('./ifd-parser')

class Decoder {
  constructor(buffer) {
    this._reader = new Reader(buffer)
  }

  _readAndValidateHeader() {
    this._reader.seek(0)
    const byteOrder = this._reader.read(2)
    if (byteOrder === 0x4949) {
      debug('interpreting as little endian')
      this._reader.setEndianess(Reader.LITTLE_ENDIAN)
    } else if (byteOrder === 0x4D4D) {
      debug('interpreting as big endian')
      this._reader.setEndianess(Reader.BIG_ENDIAN)
    } else {
      throw new Error('Unrecognized format')
    }

    const version = this._reader.read(2)
    if (version !== 42) {
      throw new Error(`Unrecognized format: ${version.toString('16')}`)
    }
  }

  _readIfds() {
    if (this._ifds) {
      return
    }

    this._ifds = []

    const ifdOffsets = [this._reader.read(4)]
    while (ifdOffsets.length) {
      const ifdOffset = ifdOffsets.shift()
      const ifd = IfdParser.parseIfd(this._reader, ifdOffset)
      this._ifds.push(ifd)

      const suboffsets = IfdParser.getSubIfdOffsets(this._reader, ifd.entries)
      suboffsets.forEach(offset => ifdOffsets.push(offset))
      if (ifd.nextIfdOffset) {
        ifdOffsets.push(ifd.nextIfdOffset)
      }
    }
  }

  extractThumbnail() {
    this._readAndValidateHeader()
    this._readIfds()

    const jpegOffsets = []
    this._ifds.forEach(ifd => {
      const jpegOffset = ifd.entries.find(entry => entry.tag === 513)
      const jpegLength = ifd.entries.find(entry => entry.tag === 514)
      const xResolution = ifd.entries.find(entry => entry.tag === 282)
      const yResolution = ifd.entries.find(entry => entry.tag === 283)
      if (jpegOffset) {
        jpegOffsets.push({
          offset: jpegOffset.data.read(4),
          length: jpegLength.data.read(4),
          width: xResolution && xResolution.data.read(2) / xResolution.data.read(2),
          height: yResolution && yResolution.data.read(2) / yResolution.data.read(2),
        })
      }
    })

    const maxResolutionJpeg = _.maxBy(jpegOffsets, item => item.width)
    this._reader.seek(maxResolutionJpeg.offset)
    return this._reader.readAsBuffer(maxResolutionJpeg.length)
  }
}

module.exports = Decoder
