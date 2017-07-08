import {IFDEntry} from './ifd-entry'
import {IFDTag} from './ifd-tag'
import {Reader} from './reader'

export interface IFDOffset {
  offset: number,
  parent?: IFD,
}

export class IFD {
  public offset: number
  public parent?: IFD
  public children: IFD[]

  public constructor(
    offset: IFDOffset,
    public entries: IFDEntry[],
    public nextIFDOffset: number,
  ) {
    this.offset = offset.offset
    this.parent = offset.parent
    this.children = []

    if (offset.parent) {
      offset.parent.children.push(this)
    }
  }

  }

  public getSubIFDOffsets(reader: Reader): number[] {
    const offsets: number[] = []
    this.entries.forEach(entry => {
      if (entry.tag !== IFDTag.SubIFD && entry.tag !== IFDTag.EXIFOffset) {
        return
      }

      const entryReader = entry.getReader(reader)
      while (entryReader.hasNext()) {
        offsets.push(entryReader.read(4))
      }
    })

    return offsets
  }

  public static read(reader: Reader, offset: IFDOffset): IFD {
    reader.seek(offset.offset)
    const numEntries = reader.read(2)
    const entries = []
    for (let i = 0; i < numEntries; i++) {
      entries.push(IFDEntry.read(reader))
    }

    const nextIFDOffset = reader.read(4)
    return new IFD(offset, entries, nextIFDOffset)
  }
}
