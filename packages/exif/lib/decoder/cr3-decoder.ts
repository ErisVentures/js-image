import {Reader} from '../utils/reader'
import {IGenericMetadata, IBufferLike, Endian, IReader} from '../utils/types'
import {createLogger} from '../utils/log'
import {TIFFDecoder} from './tiff-decoder'

/**
 * @fileoverview Process Canon .cr3 RAW
 * @see https://en.wikipedia.org/wiki/ISO_base_media_file_format
 * @see https://github.com/patrickhulce/canon_cr3/blob/master/parse_cr3.py
 */

const log = createLogger('decoder')

const NESTED_BOX_TYPES = new Set(['moov', 'trak', 'mdia', 'minf', 'dinf', 'stbl'])
const TIFF_BOX_TYPES = new Set(['CMT1', 'CMT2', 'CMT3', 'CMT4', 'CMTA'])
const UUID_PRIMARY = '85c0b687820f11e08111f4ce462b6a48'
const UUID_PREVIEW = 'eaf42b5e1c984b88b9fbb7dc406e4d16'

interface IFileBoxEntry {
  chunkName: string
  parents: IFileBoxEntry[]
  dataOffset: number
  dataLength: number
}

export class Cr3Decoder {
  private readonly _reader: IReader
  private readonly _data: IFileBoxEntry[]

  public constructor(buffer: IBufferLike) {
    this._reader = new Reader(buffer)
    this._data = []
  }

  private _handleUuidBox(parents: IFileBoxEntry[]): void {
    const uuid = this._reader.readAsHex(16)
    const position = this._reader.getPosition()
    if (uuid === UUID_PRIMARY) this._readFileBox(position, parents)
    if (uuid === UUID_PREVIEW) this._readFileBox(position + 8, parents)
  }

  private _readFileBox(start: number, parents: IFileBoxEntry[]): void {
    this._reader.seek(start)
    if (!this._reader.hasNext()) return

    let totalDataLength = this._reader.read(4)
    const chunkName = this._reader.readAsString(4)
    if (totalDataLength === 1) totalDataLength = this._reader.read(8)

    log(`discovered ${chunkName} box with size ${totalDataLength}`)

    const dataOffset = this._reader.getPosition()
    const dataLength = totalDataLength - (dataOffset - start)
    const entry: IFileBoxEntry = {chunkName, parents, dataOffset, dataLength}
    this._data.push(entry)

    const newParents = [...parents, entry]
    if (NESTED_BOX_TYPES.has(chunkName)) this._readFileBox(dataOffset, newParents)
    if (chunkName === 'uuid') this._handleUuidBox(newParents)

    if (this._reader.hasNext()) this._readFileBox(start + totalDataLength, parents)
  }

  private _readAndValidateBoxes(): void {
    if (this._data.length) return
    if (!Cr3Decoder._isLikelyCr3(this._reader)) throw new Error('Invalid cr3 file')
    this._reader.setEndianess(Endian.Big)
    this._readFileBox(0, [])
  }

  public extractJPEG(): IBufferLike {
    this._readAndValidateBoxes()

    const previews = this._data
      .filter(entry => entry.chunkName === 'PRVW')
      .sort((a, b) => b.dataLength - a.dataLength)

    if (!previews.length) throw new Error('No preview available')

    const largestPreview = previews[0]

    this._reader.seek(largestPreview.dataOffset)
    this._reader.skip(6) // padding
    const width = this._reader.read(2)
    const height = this._reader.read(2)
    this._reader.skip(2) // unknown
    const jpegLength = this._reader.read(4)
    log(`extracting jpeg preview ${width}x${height}, ${jpegLength} bytes`)

    const jpeg = this._reader.readAsBuffer(jpegLength)
    const metadata = this.extractMetadata()
    return TIFFDecoder.injectMetadataIntoJPEG(jpeg, metadata)
  }

  public extractMetadata(): IGenericMetadata {
    this._readAndValidateBoxes()

    const metadata: IGenericMetadata = {}

    for (const entry of this._data) {
      if (!TIFF_BOX_TYPES.has(entry.chunkName)) continue
      this._reader.seek(entry.dataOffset)
      const buffer = this._reader.readAsBuffer(entry.dataLength)
      if (!TIFFDecoder.isLikelyTIFF(buffer)) continue
      Object.assign(metadata, new TIFFDecoder(buffer).extractMetadata())
    }

    return metadata
  }

  private static _isLikelyCr3(reader: IReader): boolean {
    return reader.use(() => {
      reader.seek(4)
      const fileBoxType = reader.readAsString(4)
      const brand = reader.readAsString(4).trim()
      return fileBoxType === 'ftyp' && brand === 'crx'
    })
  }

  public static isLikelyCr3(buffer: IBufferLike): boolean {
    return Cr3Decoder._isLikelyCr3(new Reader(buffer))
  }
}
