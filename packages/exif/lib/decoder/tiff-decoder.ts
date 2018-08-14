import {IFD} from '../decoder/ifd'
import {getFriendlyName} from '../utils/tags'
import {Reader} from '../utils/reader'
import {
  IGenericMetadata,
  IFDTag,
  IIFDOffset,
  IBufferLike,
  Endian,
  IReader,
  IIFD,
} from '../utils/types'
import {createLogger} from '../utils/log'

const log = createLogger('decoder')

interface IThumbnailLocation {
  ifd: IIFD
  offset: number
  length: number
}

export class TIFFDecoder {
  private readonly _reader: IReader
  private _ifds: IIFD[]

  public constructor(buffer: IBufferLike) {
    this._reader = new Reader(buffer)
  }

  private _readAndValidateHeader(): void {
    this._reader.seek(0)
    const byteOrder = this._reader.read(2)
    if (byteOrder === 0x4949) {
      log('interpreting as little endian')
      this._reader.setEndianess(Endian.Little)
    } else if (byteOrder === 0x4d4d) {
      log('interpreting as big endian')
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

    const ifdOffsets: IIFDOffset[] = [{offset: this._reader.read(4)}]
    while (ifdOffsets.length) {
      const ifdOffset = ifdOffsets.shift()!
      if (this._ifds.some(ifd => ifd.offset === ifdOffset.offset)) {
        continue
      }

      log(`reading IFD at ${ifdOffset.offset}`)
      const ifd = IFD.read(this._reader, ifdOffset)
      this._ifds.push(ifd)

      const suboffsets = ifd.getSubIFDOffsets(this._reader)
      log(`IFD has ${suboffsets.length} child(ren)`)
      suboffsets.forEach(offset => ifdOffsets.push({offset, parent: ifd}))
      if (ifd.nextIFDOffset) {
        ifdOffsets.push({offset: ifd.nextIFDOffset, parent: ifd.parent})
      }
    }
  }

  public extractJpeg(): IBufferLike {
    this._readAndValidateHeader()
    this._readIFDs()

    let maxResolutionJpeg: IThumbnailLocation | undefined
    this._ifds.forEach(ifd => {
      const offsetEntry = ifd.entries.find(entry => entry.tag === IFDTag.ThumbnailOffset)
      const lengthEntry = ifd.entries.find(entry => entry.tag === IFDTag.ThumbnailLength)
      if (!offsetEntry || !lengthEntry) {
        return
      }

      const offset = offsetEntry.getValue(this._reader) as number
      const length = lengthEntry.getValue(this._reader) as number

      if (!maxResolutionJpeg || length > maxResolutionJpeg.length) {
        maxResolutionJpeg = {offset, length, ifd}
      }
    })

    if (!maxResolutionJpeg) {
      throw new Error('Could not find thumbnail IFDs')
    }

    this._reader.seek(maxResolutionJpeg.offset)
    return this._reader.readAsBuffer(maxResolutionJpeg.length)
  }

  public extractMetadata(): IGenericMetadata {
    this._readAndValidateHeader()
    this._readIFDs()

    const exifTags: IGenericMetadata = {}
    const tags: IGenericMetadata = {}
    this._ifds.forEach(ifd => {
      const target = ifd.isEXIF ? exifTags : tags
      ifd.entries.forEach(entry => {
        const name = getFriendlyName(entry.tag)
        const value = entry.getValue(this._reader)
        log.verbose(`evaluated ${name} as ${value}`)
        target[name] = value
      })
    })

    return {...tags, ...exifTags}
  }
}
