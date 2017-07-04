import {IFDParser, IFDResult} from './ifd-parser'
import {getFriendlyName, IFDTag} from './ifd-tag'
import {BufferLike, Endian, Reader} from './reader'

// tslint:disable-next-line
const debug: (...args: any[]) => void = require('debug')('raw-decoder:decoder')

export interface IMetadata {
  [key: string]: string|number|null
}

export class Decoder {
  private _reader: Reader
  private _ifds: IFDResult[]

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

  private _readIFDs(): void {
    if (this._ifds) {
      return
    }

    this._ifds = []

    const ifdOffsets = [this._reader.read(4)]
    while (ifdOffsets.length) {
      const ifdOffset = ifdOffsets.shift()!
      const ifd = IFDParser.parseIfd(this._reader, ifdOffset)
      this._ifds.push(ifd)

      const suboffsets = IFDParser.getSubIfdOffsets(this._reader, ifd.entries)
      suboffsets.forEach(offset => ifdOffsets.push(offset))
      if (ifd.nextIfdOffset) {
        ifdOffsets.push(ifd.nextIfdOffset)
      }
    }
  }

  public extractJpeg(): BufferLike {
    this._readAndValidateHeader()
    this._readIFDs()

    let maxResolutionJpeg: {offset: number, length: number} = {offset: 0, length: 0}
    this._ifds.forEach(ifd => {
      const offsetEntry = ifd.entries.find(entry => entry.tag === IFDTag.ThumbnailOffset)
      const lengthEntry = ifd.entries.find(entry => entry.tag === IFDTag.ThumbnailLength)

      const offset = offsetEntry && IFDParser.getEntryValue(this._reader, offsetEntry) as number
      const length = lengthEntry && IFDParser.getEntryValue(this._reader, lengthEntry) as number

      // TODO: choose largest JPEG by the attached EXIF IFD instead
      if (offset && length && length > maxResolutionJpeg.length) {
        maxResolutionJpeg = {length, offset}
      }
    })

    if (!maxResolutionJpeg.offset) {
      throw new Error('Could not find thumbnail IFDs')
    }

    this._reader.seek(maxResolutionJpeg.offset)
    return this._reader.readAsBuffer(maxResolutionJpeg.length)
  }

  public extractMetadata(): IMetadata {
    this._readAndValidateHeader()
    this._readIFDs()

    const tags: IMetadata = {}
    this._ifds.forEach(ifd => {
      ifd.entries.forEach(entry => {
        const name = getFriendlyName(entry.tag)
        const value = IFDParser.getEntryValue(this._reader, entry)
        tags[name] = value
      })
    })

    return tags
  }
}
