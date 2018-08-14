import {
  IGenericMetadata,
  IBufferLike,
  IFDTagName,
  BIG_ENDIAN_MARKER,
  getDataTypeSize,
  IFDGroup,
  IFDDataType,
} from '../utils/types'
import {Writer} from '../utils/writer'
import {tags} from '../utils/tags'
import {createLogger} from '../utils/log'

const log = createLogger('encoder')

const SUPPORTED = new Set([IFDDataType.Short, IFDDataType.Long])

export class TIFFEncoder {
  public static encode(metadata: IGenericMetadata): IBufferLike {
    const writer = new Writer()

    // write the big endian signal
    writer.write(BIG_ENDIAN_MARKER, 2)
    // write the magic TIFF number
    writer.write(42, 2)
    // write the offset of the first IFD
    writer.write(2 + 2 + 4, 4)

    // TODO: support other complex data types
    const entriesToWrite = Object.keys(metadata)
      .map(_name => {
        const name = _name as IFDTagName
        return {tag: tags[name], value: metadata[name]}
      })
      .filter(item => item.tag.group === IFDGroup.EXIF)
      .filter(item => SUPPORTED.has(item.tag.dataType))

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
