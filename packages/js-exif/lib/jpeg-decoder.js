const RawDecoder = require('raw-decoder').Decoder
const {Endian, Reader} = require('raw-decoder/dist/reader.js')

const EXIF_HEADER = 0x45786966 // "Exif"
const APP1 = 0xFFE1
const START_OF_SCAN = 0xFFDA
const END_OF_IMAGE = 0xFFD9

class JPEGDecoder {
  constructor(buffer) {
    this._reader = new Reader(buffer)
    this._reader.setEndianess(Endian.Big)
  }

  _readFileMarkers() {
    if (this._markers) {
      return
    }

    const reader = this._reader
    const exifBuffers = []
    reader.seek(2)

    let marker = reader.read(2)
    while (marker !== END_OF_IMAGE && reader.hasNext()) {
      if (marker === APP1) {
        const length = reader.read(2)
        const nextPosition = reader.getPosition() + length - 2
        const header = reader.read(4)
        if (header !== EXIF_HEADER) {
          reader.seek(nextPosition)
          marker = reader.read(2)
          continue
        }

        reader.skip(2)
        exifBuffers.push(reader.readAsBuffer(length - 8))
        marker = reader.read(2)
      } else if (marker === START_OF_SCAN) {
        marker = END_OF_IMAGE
      } else if (marker >> 8 === 0xFF) {
        const length = reader.read(2)
        const nextPosition = reader.getPosition() + length - 2

        const markerType = marker & 0xFF
        if (markerType === 0xC0 ||
            markerType === 0xC1 ||
            markerType === 0xC2) {
          reader.skip(1)
          this._height = reader.read(2)
          this._width = reader.read(2)
        }

        reader.seek(nextPosition)
        marker = reader.read(2)
      } else {
        throw new Error(`Unrecognized marker: ${marker.toString(16)}`)
      }
    }

    this._exifBuffers = exifBuffers
  }

  extractMetadata() {
    this._readFileMarkers()

    const metadata = {
      ImageHeight: this._height,
      ImageWidth: this._width,
    }
    for (const exifBuffer of this._exifBuffers) {
      const decoder = new RawDecoder(exifBuffer)
      Object.assign(metadata, decoder.extractMetadata())
    }

    return metadata
  }

  static isJPEG(buffer) {
    return buffer[0] === 0xFF && buffer[1] === 0xD8
  }
}

module.exports = JPEGDecoder
