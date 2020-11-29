import {IFD} from '../decoder/ifd'
import {getFriendlyName, panasonicConversionTags} from '../utils/tags'
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

enum Variant {
  Standard = 'standard',
  Olympus = 'olympus',
  Panasonic = 'panasonic',
  Unknown = 'unknown',
}

const TIFF_MAGIC_VERSION = 0x2a
/**
 * Olympus raw files are basically TIFFs but with a replaced magic text
 * @see https://libopenraw.freedesktop.org/formats/orf/
 */
const OLYMPUS_MAGIC_VERSION = 0x4f52
/**
 * Panasonic raw files are basically TIFFs but with a replaced magic text
 * @see https://libopenraw.freedesktop.org/formats/rw2/
 */
const PANASONIC_MAGIC_VERSION = 0x55

const log = createLogger('decoder')

interface IThumbnailLocation {
  ifd: IIFD
  offset: number
  length: number
}

function sequenceMatch(
  largeArray: number[] | Uint8Array,
  smallArray: number[] | Uint8Array,
  startIndex: number,
): boolean {
  for (let i = 0; i < smallArray.length; i++) {
    const iLarge = i + startIndex
    if (largeArray[iLarge] !== smallArray[i]) return false
  }

  return true
}

export class TIFFDecoder {
  private readonly _buffer: IBufferLike
  private readonly _reader: IReader
  private _variant: Variant
  private _ifds: IIFD[]
  private _cachedMetadata: IGenericMetadata
  private _cachedJPEG: IBufferLike

  public constructor(buffer: IBufferLike) {
    this._buffer = buffer
    this._reader = new Reader(buffer)
    this._variant = Variant.Unknown
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
    if (version === TIFF_MAGIC_VERSION) this._variant = Variant.Standard
    if (version === OLYMPUS_MAGIC_VERSION) this._variant = Variant.Olympus
    if (version === PANASONIC_MAGIC_VERSION) this._variant = Variant.Panasonic
    if (this._variant === Variant.Unknown) {
      throw new Error(`Unrecognized TIFF version: ${version.toString(16)}`)
    }

    log(`detected tiff variant as ${this._variant}`)
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

  private _findJPEGInRange(
    buffer: IBufferLike,
    searchStartIndex: number,
    searchEndIndex: number,
  ): IBufferLike | undefined {
    const startCandidates: number[] = []
    const endCandidates: number[] = []

    for (let i = searchStartIndex; i < searchEndIndex; i++) {
      if (buffer[i] !== 0xff) continue
      if (buffer[i + 1] !== 0xd8) continue
      if (buffer[i + 2] !== 0xff) continue
      startCandidates.push(i)
    }

    for (let i = searchEndIndex; i > searchStartIndex; i--) {
      if (buffer[i - 1] !== 0xff) continue
      if (buffer[i] !== 0xd9) continue
      endCandidates.push(i)
    }

    // If there are too many candidates to evaluate, don't guess randomly
    if (startCandidates.length * endCandidates.length > 25) return undefined

    let jpeg: IBufferLike | undefined
    let maxWidth = -Infinity
    for (const startIndex of startCandidates) {
      for (const endIndex of endCandidates) {
        if (!Number.isFinite(startIndex)) continue
        if (!Number.isFinite(endIndex)) continue
        if (endIndex - startIndex < 4000) continue

        log(`evaluating possible embedded JPEG from ${startIndex} to ${endIndex}`)
        const jpegBuffer = buffer.slice(startIndex, endIndex + 1)
        if (!JPEGDecoder.isJPEG(jpegBuffer)) continue

        const metadata = new JPEGDecoder(jpegBuffer).extractMetadata()
        if (typeof metadata.ImageWidth !== 'number') continue
        if (metadata.ImageWidth < maxWidth) continue

        maxWidth = metadata.ImageWidth
        jpeg = jpegBuffer
      }
    }

    return jpeg
  }

  /**
   * Modern RW2 use a proprietary tag for the JPEG (0x2e - JpgFromRaw)
   * @see https://github.com/exiftool/exiftool/blob/2f235f9a5618336f199c6481b452836c55de6b0c/lib/Image/ExifTool/PanasonicRaw.pm#L198-L215
   *
   * Older Panasonic raw mislabels all of their tags so the names make no sense.
   * The only thing they really label is the offset of the RAW data and the JPEG is before that.
   * So we'll just search for JPEG markers in between the IFDs and the offset of the raw data.
   */
  private _readPanasonicJPEG(): IBufferLike | undefined {
    if (this._variant !== Variant.Panasonic) return
    const ifdEntries = this.extractIFDEntries()

    const jpgFromRawEntry = ifdEntries.find(entry => entry.tag === IFDTag.JpgFromRaw)
    if (jpgFromRawEntry) {
      const value = jpgFromRawEntry.getValue(this._reader)
      if (Buffer.isBuffer(value)) return value
    }

    const searchStart = Math.max(...ifdEntries.map(value => value.startOffset))
    const endEntry = this._ifds[0].entries.find(entry => entry.tag === IFDTag.PanasonicJPEGEnd)
    if (!searchStart || !endEntry) return

    const endEntryValue = endEntry.getValue()
    if (typeof endEntryValue !== 'number') return

    return this._findJPEGInRange(this._reader.getBuffer(), searchStart, endEntryValue)
  }

  /**
   * Olympus JPEG preview is usually contained within the makernote
   */
  private _readOlympusJPEG(): IBufferLike | undefined {
    if (this._variant !== Variant.Olympus) return

    // See https://github.com/exiftool/exiftool/blob/a7f6bc1e03ff3553da66aed2b552d2e2f64b71b3/lib/Image/ExifTool/Olympus.pm#L1763-L1779
    const PREVIEW_IMAGE_OFFSET_SEQUENCE = [0x01, 0x01, 0x04, 0x00, 0x01, 0x00]
    const PREVIEW_IMAGE_LENGTH_SEQUENCE = [0x02, 0x01, 0x04, 0x00, 0x01, 0x00]
    const JPEG_SEQUENCE = [0xff, 0xd8, 0xff]

    const ifdEntries = this.extractIFDEntries()
    const makerNoteEntry = ifdEntries.find(entry => entry.tag === 37500)
    if (!makerNoteEntry) return

    const makernote = makerNoteEntry.getValue(this._reader)
    if (typeof makernote === 'string' || typeof makernote === 'number') return

    const makernoteReader = new Reader(makernote)
    makernoteReader.setEndianess(Endian.Little)

    for (let i = 0; i < makernote.length; i++) {
      // Olympus makernote has really fucked up IFD offsets.
      // So we just do a linear scan for the two tags we are looking for
      if (!sequenceMatch(makernote, PREVIEW_IMAGE_OFFSET_SEQUENCE, i)) continue
      if (!sequenceMatch(makernote, PREVIEW_IMAGE_LENGTH_SEQUENCE, i + 12)) continue

      makernoteReader.seek(i)
      const offsetEntry = IFDEntry.read(makernoteReader)
      const offset = offsetEntry.getValue(makernoteReader)
      if (typeof offset !== 'number') continue
      if (!sequenceMatch(makernote, JPEG_SEQUENCE, offset)) continue

      makernoteReader.seek(i + 12)
      const lengthEntry = IFDEntry.read(makernoteReader)
      const length = lengthEntry.getValue(makernoteReader)
      if (typeof length !== 'number') continue

      const jpegBuffer = makernote.slice(offset, offset + length)
      if (!JPEGDecoder.isJPEG(jpegBuffer)) continue
      return jpegBuffer
    }

    return this._findJPEGInRange(makernote, 0, makernote.length)
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

    // Try the manufacturer specific previews if none the standard ones worked
    const panasonicJPEG = this._readPanasonicJPEG()
    if (panasonicJPEG) return panasonicJPEG
    const olympusJPEG = this._readOlympusJPEG()
    if (olympusJPEG) return olympusJPEG

    // Fail loudly if all else fails
    throw new Error('Could not find an embedded JPEG')
  }

  private _mergeIFDMetadata(
    entries: Array<{ifd: IIFD; metadata: IGenericMetadata}>,
  ): IGenericMetadata {
    const tags: IGenericMetadata = {}

    // Merge the tags from all the IFD entries:
    //    - trust data from embedded JPEGs least
    //    - trust data from EXIF tables next
    //    - pull size data from full resolution subifds
    const nonExifEntries = entries.filter(entry => !entry.ifd.isEXIF)
    const exifEntries = entries.filter(entry => entry.ifd.isEXIF)
    const fullResolutionEntries = entries.filter(entry => entry.metadata.NewSubfileType === 0)
    for (const {metadata} of nonExifEntries.concat(exifEntries)) {
      Object.assign(tags, metadata)
    }

    for (const {metadata} of fullResolutionEntries) {
      const {ImageWidth, ImageLength} = metadata
      if (!ImageWidth || !ImageLength) continue
      Object.assign(tags, {ImageWidth, ImageLength})
    }

    return tags
  }

  public extractJPEG(options: IJPEGOptions = {}): IBufferLike {
    if (this._cachedJPEG) return this._cachedJPEG.slice()

    this._readAndValidateHeader()
    this._readIFDs()

    const jpeg = this._readLargestJPEG()
    if (options.skipMetadata) return jpeg

    const metadata = this.extractMetadata()
    this._cachedJPEG = TIFFDecoder.injectMetadataIntoJPEG(jpeg, metadata)
    return this._cachedJPEG.slice()
  }

  public extractMetadata(): IGenericMetadata {
    if (this._cachedMetadata) return {...this._cachedMetadata}

    this._readAndValidateHeader()
    this._readIFDs()

    const entries: Array<{ifd: IIFD; metadata: IGenericMetadata}> = []
    this._ifds.forEach(ifd => {
      const tagsForIfd: IGenericMetadata = {}

      ifd.entries.forEach(entry => {
        const name = getFriendlyName(entry.tag)
        const value = entry.getValue(this._reader)
        const displayValue =
          typeof value === 'string' || typeof value === 'number'
            ? value.toString()
            : value.slice(0, 32)
        log.verbose(`evaluated ${name} (${entry.tag} - ${entry.dataType}) as ${displayValue}`)
        if (typeof value !== 'string' && typeof value !== 'number') return
        tagsForIfd[name] = value

        const panasonicName = panasonicConversionTags[name]
        if (this._variant === Variant.Panasonic && panasonicName) {
          tagsForIfd[panasonicName] = value
        }

        entries.push({ifd, metadata: tagsForIfd})
      })
    })

    this._cachedMetadata = this._mergeIFDMetadata(entries)
    return {...this._cachedMetadata}
  }

  public extractIFDEntries(): IIFDEntry[] {
    this._readAndValidateHeader()
    this._readIFDs()
    return this._ifds.map(ifd => ifd.entries).reduce((a, b) => a.concat(b), [])
  }

  public static injectMetadataIntoJPEG(jpeg: IBufferLike, metadata: IGenericMetadata): IBufferLike {
    const metadataToInject = {...metadata}
    delete metadataToInject.ImageWidth
    delete metadataToInject.ImageLength
    delete metadataToInject.EXIFImageWidth
    delete metadataToInject.EXIFImageHeight
    const metadataBuffer = TIFFEncoder.encode(metadataToInject)
    return JPEGDecoder.injectEXIFMetadata(jpeg, metadataBuffer)
  }

  public static isLikelyTIFF(buffer: IBufferLike): boolean {
    return (buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4d && buffer[1] === 0x4d)
  }

  public static replaceIFDEntry(decoder: TIFFDecoder, tag: IFDTagName, data: Buffer): Buffer {
    const ifd = decoder.extractIFDEntries().find(ifd => getFriendlyName(ifd.tag) === tag)
    if (!ifd) throw new Error(`Could not find "${tag}" in buffer`)
    return IFDEntry.mutate(Buffer.from(decoder._buffer), ifd, data, decoder._reader.getEndianess())
  }
}
