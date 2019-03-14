import {getFriendlyName} from '../utils/tags'
import {IFDDataType, IIFDEntry, IReader, IFDTagName, getDataTypeSize} from '../utils/types'
import {createLogger} from '../utils/log'

const log = createLogger('ifd-entry')

export class IFDEntry implements IIFDEntry {
  public constructor(
    public tag: number,
    public dataType: number,
    public length: number,
    private readonly dataReader: IReader,
  ) {}

  public get lengthInBytes(): number {
    return this.length * getDataTypeSize(this.dataType, this.tag)
  }

  public get friendlyTagName(): IFDTagName {
    return getFriendlyName(this.tag)
  }

  public getValue(reader?: IReader): string | number {
    const entryReader = this.getReader(reader)
    switch (this.dataType) {
      // TODO: verify signed versions
      case IFDDataType.Byte:
      case IFDDataType.Short:
      case IFDDataType.Long:
      case IFDDataType.SignedByte:
      case IFDDataType.SignedShort:
      case IFDDataType.SignedLong:
        return entryReader.read(this.lengthInBytes)
      case IFDDataType.Rational:
      case IFDDataType.SignedRational:
        return entryReader.read(4) / entryReader.read(4)
      case IFDDataType.String:
        const chars = []
        while (entryReader.hasNext()) {
          const charCode = entryReader.read(1)
          if (charCode === 0) {
            break
          }

          chars.push(String.fromCharCode(charCode))
        }

        return chars.join('')
      case IFDDataType.Float:
        return new DataView(entryReader.readAsBuffer(4).buffer).getFloat32(0)
      case IFDDataType.Double:
        return new DataView(entryReader.readAsBuffer(8).buffer).getFloat64(0)
      case IFDDataType.Undefined:
        return ''
      default:
        throw new TypeError(`Unsupported data type (${this.dataType}) for tag (${this.tag})`)
    }
  }

  public getReader(reader?: IReader): IReader {
    this.dataReader.seek(0)

    if (this.lengthInBytes <= 4) {
      return this.dataReader
    }

    if (!reader) {
      throw new Error('Cannot read value of IFD entry without a reader')
    }

    const offset = this.dataReader.read(4)
    return reader.use(() => {
      reader.seek(offset)
      return reader.readAsReader(this.lengthInBytes)
    })
  }

  public static read(reader: IReader): IFDEntry {
    const tag = reader.read(2)
    const dataType = reader.read(2)
    const length = reader.read(4)
    const dataReader = reader.readAsReader(4)

    log.verbose(`read tag ${tag}`, dataReader)
    return new IFDEntry(tag, dataType, length, dataReader)
  }
}
