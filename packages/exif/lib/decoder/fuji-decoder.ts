import {Reader} from '../utils/reader'
import {JPEGDecoder} from './jpeg-decoder'
import {IGenericMetadata, IBufferLike, Endian, IReader} from '../utils/types'
import {createLogger} from '../utils/log'

/**
 * @fileoverview Process Fujifilm .raf RAW CCD files.
 * @see https://libopenraw.freedesktop.org/formats/raf/
 * @see https://web.archive.org/web/20090214101740/http://crousseau.free.fr:80/imgfmt_raw.htm
 */

const log = createLogger('decoder')

export const FUJI_MAGIC_STRING = 'FUJIFILMCCD-RAW'

export class FujiDecoder {
  private readonly _reader: IReader

  public constructor(buffer: IBufferLike) {
    this._reader = new Reader(buffer)
  }

  private _readAndValidateHeader(): void {
    this._reader.seek(0)
    this._reader.setEndianess(Endian.Big)
    const magic = this._reader.readAsString(FUJI_MAGIC_STRING.length)
    this._reader.skip(1) // skip the null terminator
    if (magic !== FUJI_MAGIC_STRING) throw new Error('Missing magic FUJI marker')

    const version = this._reader.readAsString(4)
    if (version !== '0200' && version !== '0201') {
      throw new Error(`Unrecognized Fuji version: "${version}"`)
    }

    const cameraId = this._reader.read(8)
    const cameraName = this._reader.readAsString(32)
    log(`read from fujifilm raf - ${cameraName} (${cameraId})`)
  }

  public extractJPEG(): IBufferLike {
    this._readAndValidateHeader()

    // Skip the directory version and unknown bytes (4 + 20)
    this._reader.skip(24)

    const jpegOffset = this._reader.read(4)
    const jpegLength = this._reader.read(4)
    this._reader.seek(jpegOffset)
    return this._reader.readAsBuffer(jpegLength)
  }

  public extractMetadata(): IGenericMetadata {
    return new JPEGDecoder(this.extractJPEG()).extractMetadata()
  }
}
