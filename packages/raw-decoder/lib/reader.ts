export type BufferLike = Buffer|Uint8Array

export enum Endian {
  Big,
  Little,
}

export class Reader {
  public constructor(
    private _buffer: BufferLike,
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
      this._readLE(length) :
      this._readBE(length)
    this._position += length
    return value
  }

  private _readLE(length: number): number {
    let value = 0
    for (let i = length - 1; i >= 0; i--) {
      // tslint:disable-next-line no-bitwise
      value = value << 8 | this._buffer[this._position + i]
    }
    return value
  }

  private _readBE(length: number): number {
    let value = 0
    for (let i = 0; i < length; i++) {
      // tslint:disable-next-line no-bitwise
      value = value << 8 | this._buffer[this._position + i]
    }
    return value
  }

  public readAsBuffer(length: number): BufferLike {
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
