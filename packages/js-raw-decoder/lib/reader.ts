export enum Endian {
  Big,
  Little,
}

export class Reader {
  public constructor(
    private _buffer: Buffer,
    private _position: number = 0,
    private _endianness: Endian = Endian.Big) {
  }

  public hasNext(): boolean {
    return this._position < this._buffer.length
  }

  public getPosition(): number {
    return this._position
  }

  public setEndianess(endian: Endian): void {
    this._endianness = endian
  }

  public read(length: number): number {
    const value = this._endianness === Endian.Little ?
      this._buffer.readUIntLE(this._position, length) :
      this._buffer.readUIntBE(this._position, length)
    this._position += length
    return value
  }

  public readAsBuffer(length: number): Buffer {
    const value = this._buffer.slice(this._position, this._position + length)
    this._position += length
    return value
  }

  public readAsReader(length: number): Reader {
    return new Reader(this.readAsBuffer(length), 0, this._endianness)
  }

  public skip(diff: number): void {
    this._position = this._position + diff
  }

  public seek(position: number): void {
    this._position = position
  }

  public use<T>(func: () => T): T  {
    const position = this._position
    const value = func()
    this._position = position
    return value
  }
}
