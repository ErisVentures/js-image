import {IfdTag} from './ifd-tag'
import {Reader} from './reader'

export enum IfdDataType {
  Unknown = 0,
  Byte = 1,
  String = 2,
  Word = 3,
  DoubleWord = 4,
  RationalNumber = 5,
  OtherRationalNumber = 10,
}

export interface IfdEntry {
  tag: number,
  dataType: number,
  length: number,
  lengthInBytes: number,
  data: Reader|undefined,
  dataOffset: number|undefined,
}

export interface IfdResult {
  entries: IfdEntry[],
  nextIfdOffset: number,
}

export class IfdParser {
  public static getDataTypeSize(dataType: number): number {
    switch (dataType) {
      case IfdDataType.Unknown: // ???
      case IfdDataType.Byte: // byte
      case IfdDataType.String: // ASCII-string
        return 1
      case IfdDataType.Word: // word
        return 2
      case IfdDataType.DoubleWord: // double word
        return 4
      case IfdDataType.RationalNumber: // rational number
      case IfdDataType.OtherRationalNumber:
        return 8
      case 7:
        return 4
      default:
        throw new TypeError(`unknown datatype: ${dataType}`)
    }
  }

  public static parseEntry(reader: Reader): IfdEntry {
    const tag = reader.read(2)
    const dataType = reader.read(2)
    const dataTypeSize = IfdParser.getDataTypeSize(dataType)
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

  public static parseIfd(reader: Reader, startPosition: number): IfdResult {
    reader.seek(startPosition)
    const numEntries = reader.read(2)
    const entries = []
    for (let i = 0; i < numEntries; i++) {
      entries.push(IfdParser.parseEntry(reader))
    }

    const nextIfdOffset = reader.read(4)
    return {entries, nextIfdOffset}
  }

  public static getEntryReader(reader: Reader, entry: IfdEntry): Reader {
    if (entry.data) {
      return entry.data
    }

    return reader.use(() => {
      reader.seek(entry.dataOffset!)
      return reader.readAsReader(entry.lengthInBytes)
    })
  }

  public static getEntryValue(reader: Reader, entry: IfdEntry): string|number {
    const entryReader = IfdParser.getEntryReader(reader, entry)
    switch (entry.dataType) {
      case IfdDataType.Byte:
      case IfdDataType.Word:
      case IfdDataType.DoubleWord:
        return entryReader.read(entry.lengthInBytes)
      case IfdDataType.RationalNumber:
      case IfdDataType.OtherRationalNumber:
        return entryReader.read(4) / entryReader.read(4)
      case IfdDataType.String:
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

  public static getSubIfdOffsets(reader: Reader, entries: IfdEntry[]): number[] {
    const offsets: number[] = []
    entries.forEach(entry => {
      if (entry.tag !== IfdTag.SubIFD && entry.tag !== IfdTag.ExifOffset) {
        return
      }

      const entryReader = IfdParser.getEntryReader(reader, entry)
      while (entryReader.hasNext()) {
        offsets.push(entryReader.read(4))
      }
    })

    return offsets
  }
}
