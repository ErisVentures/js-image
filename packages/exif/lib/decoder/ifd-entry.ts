import {getFriendlyName} from './ifd-tag'
import {IFDDataType, IIFDEntry, IReader, IFDTagName} from '../utils/types'

export function getDataTypeSize(dataType: number): number {
  switch (dataType) {
    case IFDDataType.Unknown: // ???
    case IFDDataType.Byte: // byte
    case IFDDataType.String: // ASCII-string
      return 1
    case IFDDataType.Short: // word
      return 2
    case IFDDataType.Long: // double word
    case IFDDataType.Undefined:
      return 4
    case IFDDataType.Rational: // rational number
    case IFDDataType.SignedRational:
      return 8
    default:
      throw new TypeError(`unknown datatype: ${dataType}`)
  }
}

export class IFDEntry implements IIFDEntry {
  public constructor(
    public tag: number,
    public dataType: number,
    public length: number,
    private readonly dataReader: IReader,
  ) {}

  public get lengthInBytes(): number {
    return this.length * getDataTypeSize(this.dataType)
  }

  public get friendlyTagName(): IFDTagName {
    return getFriendlyName(this.tag)
  }

  public getValue(reader?: IReader): string | number {
    const entryReader = this.getReader(reader)
    switch (this.dataType) {
      case IFDDataType.Byte:
      case IFDDataType.Short:
      case IFDDataType.Long:
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
      case 7:
        return ''
      default:
        throw new TypeError(`Unsupported data type: ${this.dataType}`)
    }
  }

  public getReader(reader?: IReader): IReader {
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

    return new IFDEntry(tag, dataType, length, dataReader)
  }
}
