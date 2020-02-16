import {IBufferLike, IReader, Endian} from '../utils/types'

export class Reader implements IReader {
  public constructor(
    private readonly _buffer: IBufferLike,
    private _position: number = 0,
    private _endianness: Endian = Endian.Big,
  ) {}

  public getBuffer(): IBufferLike {
    return this._buffer
  }

  public hasNext(): boolean {
    return this._position < this._buffer.length
  }

  public getPosition(): number {
    return this._position
  }

  public getEndianess(): Endian {
    return this._endianness
  }

  public setEndianess(endian: Endian): void {
    this._endianness = endian
  }

  public read(length: number): number {
    const value = this._endianness === Endian.Little ? this._readLE(length) : this._readBE(length)
    this._position += length
    return value
  }

  private _readLE(length: number): number {
    let value = 0
    for (let i = length - 1; i >= 0; i--) {
      value = (value << 8) | this._buffer[this._position + i]
    }
    return value
  }

  private _readBE(length: number): number {
    let value = 0
    for (let i = 0; i < length; i++) {
      value = (value << 8) | this._buffer[this._position + i]
    }
    return value
  }

  public readAsString(length: number): string {
    return this.readAsBuffer(length).toString()
  }

  public readAsHex(length: number): string {
    const maxChunkLength = 2
    const chunks: string[] = []
    for (let i = 0; i < length; i += maxChunkLength) {
      const chunkLength = Math.min(maxChunkLength, length - i)
      let chunk = this.read(chunkLength).toString(16)
      while (chunk.length < chunkLength * 2) chunk = `0${chunk}`
      chunks.push(chunk)
    }

    return this._endianness === Endian.Big ? chunks.join('') : chunks.reverse().join('')
  }

  public readAsBuffer(length: number): IBufferLike {
    const value = this._buffer.slice(this._position, this._position + length)
    this._position += length
    return value
  }

  public readAsReader(length: number): IReader {
    return new Reader(this.readAsBuffer(length), 0, this._endianness)
  }

  public skip(diff: number): void {
    this._position = this._position + diff
  }

  public seek(position: number): void {
    this._position = position
  }

  public use<T>(func: () => T): T {
    const position = this._position
    const value = func()
    this._position = position
    return value
  }
}
