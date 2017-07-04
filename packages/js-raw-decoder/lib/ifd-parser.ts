import {IFDTag} from './ifd-tag'
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

export interface IFDEntry {
  tag: number,
  dataType: number,
  length: number,
  lengthInBytes: number,
  data: Reader|undefined,
  dataOffset: number|undefined,
}

export interface IFDResult {
  entries: IFDEntry[],
  nextIfdOffset: number,
}

export class IFDParser {
  public static getDataTypeSize(dataType: number): number {
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

  public static parseEntry(reader: Reader): IFDEntry {
    const tag = reader.read(2)
    const dataType = reader.read(2)
    const dataTypeSize = IFDParser.getDataTypeSize(dataType)
    const length = reader.read(4)
    const lengthInBytes = dataTypeSize * length
    let data: Reader|undefined = reader.readAsReader(4)
    let dataOffset: number|undefined
    if (lengthInBytes > 4) {
      dataOffset = data.read(4)
      data = undefined
    }

    return {tag, dataType, length, lengthInBytes, data, dataOffset}
  }

  public static parseIfd(reader: Reader, startPosition: number): IFDResult {
    reader.seek(startPosition)
    const numEntries = reader.read(2)
    const entries = []
    for (let i = 0; i < numEntries; i++) {
      entries.push(IFDParser.parseEntry(reader))
    }

    const nextIfdOffset = reader.read(4)
    return {entries, nextIfdOffset}
  }

  public static getEntryReader(reader: Reader, entry: IFDEntry): Reader {
    if (entry.data) {
      return entry.data
    }

    return reader.use(() => {
      reader.seek(entry.dataOffset!)
      return reader.readAsReader(entry.lengthInBytes)
    })
  }

  public static getEntryValue(reader: Reader, entry: IFDEntry): string|number {
    const entryReader = IFDParser.getEntryReader(reader, entry)
    switch (entry.dataType) {
      case IFDDataType.Byte:
      case IFDDataType.Word:
      case IFDDataType.DoubleWord:
        return entryReader.read(entry.lengthInBytes)
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
        throw new TypeError(`Unsupported data type: ${entry.dataType}`)
    }
  }

  public static getSubIfdOffsets(reader: Reader, entries: IFDEntry[]): number[] {
    const offsets: number[] = []
    entries.forEach(entry => {
      if (entry.tag !== IFDTag.SubIFD && entry.tag !== IFDTag.ExifOffset) {
        return
      }

      const entryReader = IFDParser.getEntryReader(reader, entry)
      while (entryReader.hasNext()) {
        offsets.push(entryReader.read(4))
      }
    })

    return offsets
  }
}
