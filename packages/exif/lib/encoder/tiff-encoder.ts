import {
  IGenericMetadata,
  IBufferLike,
  IFDTagName,
  BIG_ENDIAN_MARKER,
  getDataTypeSize,
  IFDGroup,
  IFDDataType,
  IIFDTagDefinition,
  IFDTag,
} from '../utils/types'
import {Writer} from '../utils/writer'
import {tags} from '../utils/tags'
import {createLogger} from '../utils/log'

const log = createLogger('encoder')

const DISALLOWED_TAGS = new Set([
  IFDTag.SubIFD,
  IFDTag.EXIFOffset,
  IFDTag.StripOffsets,
  IFDTag.StripByteCounts,
  IFDTag.ThumbnailOffset,
  IFDTag.ThumbnailLength,
  IFDTag.RowsPerStrip,
])

const ALLOWLIST_TAGS = new Set([
  // These are what we really need
  tags.ImageWidth.code,
  tags.ImageLength.code,
  tags.Orientation.code,
  tags.ISO.code,

  // These were added for backcompat, but might not actually work.
  tags.Compression.code,
  tags.ResolutionUnit.code,
  tags.PhotometricInterpretation.code,
  tags.SamplesPerPixel.code,
  tags.PlanarConfiguration.code,
  tags.MeteringMode.code,
  tags.YCbCrPositioning.code,
  tags.BitsPerSample.code,
  tags.NewSubfileType.code,
  tags.AsShotNeutral.code,
  tags.CalibrationIlluminant1.code,
  tags.CalibrationIlluminant2.code,
  tags.WhiteLevel.code,
  tags.TileWidth.code,
  tags.TileLength.code,
  tags.GPSTag.code,
])

export class TIFFEncoder {
  public static isSupportedEntry(tag: IIFDTagDefinition | undefined, value: any): boolean {
    if (!tag) return false
    if (tag.group !== IFDGroup.EXIF) return false
    if (DISALLOWED_TAGS.has(tag.code)) return false
    if (!ALLOWLIST_TAGS.has(tag.code)) return false
    if (typeof value !== 'number') return false
    if (tag.dataType === IFDDataType.Short) return value < Math.pow(2, 16)
    if (tag.dataType === IFDDataType.Long) return value < Math.pow(2, 32)
    return false
  }

  public static encode(metadata: IGenericMetadata): IBufferLike {
    const writer = new Writer()

    // write the big endian signal
    writer.write(BIG_ENDIAN_MARKER, 2)
    // write the magic TIFF number
    writer.write(42, 2)
    // write the offset of the first IFD
    writer.write(2 + 2 + 4, 4)

    // TODO: strip out SubIFD/GPSIFD tags
    // TODO: support other complex data types
    const entriesToWrite = Object.keys(metadata)
      .map(_name => {
        const name = _name as IFDTagName
        return {tag: tags[name], value: metadata[name]}
      })
      .filter(item => TIFFEncoder.isSupportedEntry(item.tag, item.value))

    // write the number of entries we're writing
    log(`writing ${entriesToWrite.length} entries`)
    writer.write(entriesToWrite.length, 2)

    for (const {tag, value} of entriesToWrite) {
      log.verbose(`writing ${value} to ${tag.name}`)
      writer.write(tag.code, 2)
      writer.write(tag.dataType, 2)
      // write the length of the entry
      writer.write(1, 4)
      // write the value itself
      const valueLength = getDataTypeSize(tag.dataType) * 1
      writer.write(value as number, valueLength)
      writer.skip(4 - valueLength)
    }

    return writer.toBuffer()
  }
}
