import {IFDEntry} from './ifd-entry'
import {IFDTag} from './ifd-tag'
import {Reader} from './reader'

export class IFD {
  public constructor(
    public entries: IFDEntry[],
    public nextIFDOffset: number,
    public parent?: IFD,
  ) {

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

  public static read(reader: Reader, parent?: IFD): IFD {
    const numEntries = reader.read(2)
    const entries = []
    for (let i = 0; i < numEntries; i++) {
      entries.push(IFDEntry.read(reader))
    }

    const nextIFDOffset = reader.read(4)
    return new IFD(entries, nextIFDOffset, parent)
  }
}
