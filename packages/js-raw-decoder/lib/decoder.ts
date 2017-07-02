import {maxBy} from 'lodash'
import {IfdParser, IfdResult} from './ifd-parser'
import {BufferLike, Endian, Reader} from './reader'

// tslint:disable-next-line
const debug: (...args: any[]) => void = require('debug')('raw-decoder:decoder')

export class Decoder {
  private _reader: Reader
  private _ifds: IfdResult[]

  public constructor(buffer: BufferLike) {
    this._reader = new Reader(buffer)
  }

  private _readAndValidateHeader(): void {
    this._reader.seek(0)
    const byteOrder = this._reader.read(2)
    if (byteOrder === 0x4949) {
      debug('interpreting as little endian')
      this._reader.setEndianess(Endian.Little)
    } else if (byteOrder === 0x4D4D) {
      debug('interpreting as big endian')
      this._reader.setEndianess(Endian.Big)
    } else {
      throw new Error('Unrecognized format')
    }

    const version = this._reader.read(2)
    if (version !== 42) {
      throw new Error(`Unrecognized format: ${version.toString(16)}`)
    }
  }

  private _readIfds(): void {
    if (this._ifds) {
      return
    }

    this._ifds = []

    const ifdOffsets = [this._reader.read(4)]
    while (ifdOffsets.length) {
      const ifdOffset = ifdOffsets.shift()!
      const ifd = IfdParser.parseIfd(this._reader, ifdOffset)
      this._ifds.push(ifd)

      const suboffsets = IfdParser.getSubIfdOffsets(this._reader, ifd.entries)
      suboffsets.forEach(offset => ifdOffsets.push(offset))
      if (ifd.nextIfdOffset) {
        ifdOffsets.push(ifd.nextIfdOffset)
      }
    }
  }

  public extractThumbnail(): BufferLike {
    this._readAndValidateHeader()
    this._readIfds()

    const jpegOffsets: Array<{offset: number, length: number, width: number, height: number}> = []
    this._ifds.forEach(ifd => {
      const jpegOffset = ifd.entries.find(entry => entry.tag === 513)
      const jpegLength = ifd.entries.find(entry => entry.tag === 514)
      const xResolution = ifd.entries.find(entry => entry.tag === 282)
      const yResolution = ifd.entries.find(entry => entry.tag === 283)
      if (jpegOffset && jpegLength && xResolution && yResolution) {
        jpegOffsets.push({
          height: yResolution.data!.read(2) / yResolution.data!.read(2),
          length: jpegLength.data!.read(4),
          offset: jpegOffset.data!.read(4),
          width: xResolution.data!.read(2) / xResolution.data!.read(2),
        })
      }
    })

    const maxResolutionJpeg = maxBy(jpegOffsets, item => item.width)
    this._reader.seek(maxResolutionJpeg.offset)
    return this._reader.readAsBuffer(maxResolutionJpeg.length)
  }
}
