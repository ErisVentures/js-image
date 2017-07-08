import {getFriendlyName} from './ifd-tag'
import {Reader} from './reader'

export enum IFDDataType {
  Unknown = 0,
  Byte = 1,
  String = 2,
  Word = 3,
  DoubleWord = 4,
  RationalNumber = 5,
  OtherRationalNumber = 10,
}

// tslint:disable-next-line
export function getDataTypeSize(dataType: number): number {
  switch (dataType) {
    case IFDDataType.Unknown: // ???
    case IFDDataType.Byte: // byte
    case IFDDataType.String: // ASCII-string
      return 1
    case IFDDataType.Word: // word
      return 2
    case IFDDataType.DoubleWord: // double word
      return 4
    case IFDDataType.RationalNumber: // rational number
    case IFDDataType.OtherRationalNumber:
      return 8
    case 7:
      return 4
    default:
      throw new TypeError(`unknown datatype: ${dataType}`)
  }
}

export class IFDEntry {
  public constructor(
    public tag: number,
    public dataType: number,
    public length: number,
    private dataReader: Reader,
  ) {

  }

  public get lengthInBytes(): number {
    return this.length * getDataTypeSize(this.dataType)
  }

  public get friendlyTagName(): string {
    return getFriendlyName(this.tag)
  }

  public getValue(reader?: Reader): string|number {
    const entryReader = this.getReader(reader)
    switch (this.dataType) {
      case IFDDataType.Byte:
      case IFDDataType.Word:
      case IFDDataType.DoubleWord:
        return entryReader.read(this.lengthInBytes)
      case IFDDataType.RationalNumber:
      case IFDDataType.OtherRationalNumber:
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

  public getReader(reader?: Reader): Reader {
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

  public static read(reader: Reader): IFDEntry {
    const tag = reader.read(2)
    const dataType = reader.read(2)
    const length = reader.read(4)
    const dataReader = reader.readAsReader(4)

    return new IFDEntry(tag, dataType, length, dataReader)
  }
}
