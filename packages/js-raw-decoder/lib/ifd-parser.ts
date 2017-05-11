import {Reader} from './reader'

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
      case 0: // ???
      case 1: // byte
      case 2: // ASCII-string
        return 1
      case 3: // word
        return 2
      case 4: // double word
      case 5: // rational number
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
    let dataOffset
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

  public static getEntryData(reader: Reader, entry: IfdEntry): Reader {
    if (entry.data) {
      return entry.data
    }

    return reader.use(() => {
      reader.seek(entry.dataOffset!)
      return reader.readAsReader(entry.lengthInBytes)
    })
  }

  public static getSubIfdOffsets(reader: Reader, entries: IfdEntry[]): number[] {
    const offsets: number[] = []
    entries.forEach(entry => {
      if (entry.tag !== 330) {
        return
      }

      const entryReader = IfdParser.getEntryData(reader, entry)
      while (entryReader.hasNext()) {
        offsets.push(entryReader.read(4))
      }
    })

    return offsets
  }
}
