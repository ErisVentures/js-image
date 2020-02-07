import {IFD} from '../decoder/ifd'
import {getFriendlyName} from '../utils/tags'
import {Reader} from '../utils/reader'
import {TIFFEncoder} from '../encoder/tiff-encoder'
import {JPEGDecoder} from './jpeg-decoder'
import {
  LITTLE_ENDIAN_MARKER,
  BIG_ENDIAN_MARKER,
  IGenericMetadata,
  IFDTag,
  IIFDOffset,
  IBufferLike,
  Endian,
  IReader,
  IIFD,
  IJPEGOptions,
  IIFDEntry,
  IFDTagName,
} from '../utils/types'
import {createLogger} from '../utils/log'
import {IFDEntry} from './ifd-entry'

const TIFF_MAGIC_VERSION = 42
/**
 * Olympus raw files are basically TIFFs but with a replaced magic text
 * @see https://libopenraw.freedesktop.org/formats/orf/
 */
const OLYMPUS_MAGIC_VERSION = 0x4f52

const log = createLogger('decoder')

interface IThumbnailLocation {
  ifd: IIFD
  offset: number
  length: number
}

export class TIFFDecoder {
  private readonly _buffer: IBufferLike
  private readonly _reader: IReader
  private _ifds: IIFD[]
  private _cachedMetadata: IGenericMetadata
  private _cachedJPEG: IBufferLike

  public constructor(buffer: IBufferLike) {
    this._buffer = buffer
    this._reader = new Reader(buffer)
  }

  private _readAndValidateHeader(): void {
    this._reader.seek(0)
    const byteOrder = this._reader.read(2)
    if (byteOrder === LITTLE_ENDIAN_MARKER) {
      log('interpreting as little endian')
      this._reader.setEndianess(Endian.Little)
    } else if (byteOrder === BIG_ENDIAN_MARKER) {
      log('interpreting as big endian')
      this._reader.setEndianess(Endian.Big)
    } else {
      throw new Error('Unrecognized TIFF format')
    }

    const version = this._reader.read(2)
    if (version !== TIFF_MAGIC_VERSION && version !== OLYMPUS_MAGIC_VERSION) {
      throw new Error(`Unrecognized TIFF version: ${version.toString(16)}`)
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

  private _readLargestJPEGThumbnail(): IBufferLike | undefined {
    let maxResolutionJPEG: IThumbnailLocation | undefined
    this._ifds.forEach(ifd => {
      const offsetEntry = ifd.entries.find(entry => entry.tag === IFDTag.ThumbnailOffset)
      const lengthEntry = ifd.entries.find(entry => entry.tag === IFDTag.ThumbnailLength)
      if (!offsetEntry || !lengthEntry) {
        return
      }

      const offset = offsetEntry.getValue(this._reader) as number
      const length = lengthEntry.getValue(this._reader) as number

      if (!maxResolutionJPEG || length > maxResolutionJPEG.length) {
        maxResolutionJPEG = {offset, length, ifd}
      }
    })

    if (!maxResolutionJPEG) {
      return undefined
    }

    this._reader.seek(maxResolutionJPEG.offset)
    return this._reader.readAsBuffer(maxResolutionJPEG.length)
  }

  private _readStripOffsetsAsJPEG(): IBufferLike | undefined {
    let maxResolutionJPEG: {buffer: IBufferLike; metadata: IGenericMetadata} | undefined
    this._ifds.forEach(ifd => {
      const compressionEntry = ifd.entries.find(entry => entry.tag === IFDTag.Compression)
      const stripOffsetsEntry = ifd.entries.find(entry => entry.tag === IFDTag.StripOffsets)
      const stripBytesEntry = ifd.entries.find(entry => entry.tag === IFDTag.StripByteCounts)
      if (!compressionEntry || !stripOffsetsEntry || !stripBytesEntry) return

      const compression = compressionEntry.getValue(this._reader) as number
      // From EXIF and DNG specs, 6 and 7 signal JPEG-compressed data
      // https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html#Compression
      if (compression !== 6 && compression !== 7) return

      const offset = stripOffsetsEntry.getValue(this._reader) as number
      const length = stripBytesEntry.getValue(this._reader) as number
      const jpegBuffer = this._reader.use(() => {
        this._reader.seek(offset)
        return this._reader.readAsBuffer(length)
      })

      if (!JPEGDecoder.isJPEG(jpegBuffer)) return

      const jpeg = new JPEGDecoder(jpegBuffer)
      const metadata = jpeg.extractMetadata()
      if (!metadata.ImageLength || !metadata.ImageWidth) return

      if (!maxResolutionJPEG || metadata.ImageWidth > maxResolutionJPEG.metadata.ImageWidth!) {
        // TODO: throw if there's more than one strip
        maxResolutionJPEG = {metadata, buffer: jpegBuffer}
      }
    })

    if (!maxResolutionJPEG) {
      return undefined
    }

    return maxResolutionJPEG.buffer
  }

  private _readLargestJPEG(): IBufferLike {
    // Try to read the JPEG thumbnail first
    const maxThumbnailJPEG = this._readLargestJPEGThumbnail()
    const thumbnailSize = (maxThumbnailJPEG && maxThumbnailJPEG.length) || 0
    // Only return it immediately if it seems large enough (>500KB)
    if (maxThumbnailJPEG && thumbnailSize > 500 * 1000) return maxThumbnailJPEG

    // Otherwise we'll fallback to the JPEG strip offsets
    const maxStripOffsetJPEG = this._readStripOffsetsAsJPEG()
    // Only return it if it's larger than the thumbnail
    if (maxStripOffsetJPEG && maxStripOffsetJPEG.length > thumbnailSize) return maxStripOffsetJPEG
    // Fallback to the small thumbnail if that's all we found
    if (maxThumbnailJPEG) return maxThumbnailJPEG
    // Fail loudly if all else fails
    throw new Error('Could not find thumbnail or read StripOffsets IFDs')
  }

  public extractJPEG(options: IJPEGOptions = {}): IBufferLike {
    if (this._cachedJPEG) return this._cachedJPEG.slice()

    this._readAndValidateHeader()
    this._readIFDs()

    const jpeg = this._readLargestJPEG()
    if (options.skipMetadata) return jpeg

    const metadata = this.extractMetadata()
    delete metadata.ImageWidth
    delete metadata.ImageLength
    delete metadata.EXIFImageWidth
    delete metadata.EXIFImageHeight
    const metadataBuffer = TIFFEncoder.encode(metadata)

    this._cachedJPEG = JPEGDecoder.injectEXIFMetadata(jpeg, metadataBuffer)
    return this._cachedJPEG.slice()
  }

  public extractMetadata(): IGenericMetadata {
    if (this._cachedMetadata) return {...this._cachedMetadata}

    this._readAndValidateHeader()
    this._readIFDs()

    const exifTags: IGenericMetadata = {}
    const tags: IGenericMetadata = {}
    this._ifds.forEach(ifd => {
      const target = ifd.isEXIF ? exifTags : tags
      ifd.entries.forEach(entry => {
        const name = getFriendlyName(entry.tag)
        const value = entry.getValue(this._reader)
        log.verbose(`evaluated ${name} (${entry.tag} - ${entry.dataType}) as ${value}`)
        target[name] = value
      })
    })

    this._cachedMetadata = {...tags, ...exifTags}
    return {...this._cachedMetadata}
  }

  public extractIFDEntries(): IIFDEntry[] {
    this._readAndValidateHeader()
    this._readIFDs()
    return this._ifds.map(ifd => ifd.entries).reduce((a, b) => a.concat(b), [])
  }

  public static replaceIFDEntry(decoder: TIFFDecoder, tag: IFDTagName, data: Buffer): Buffer {
    const ifd = decoder.extractIFDEntries().find(ifd => getFriendlyName(ifd.tag) === tag)
    if (!ifd) throw new Error(`Could not find "${tag}" in buffer`)
    return IFDEntry.mutate(Buffer.from(decoder._buffer), ifd, data, decoder._reader.getEndianess())
  }
}
