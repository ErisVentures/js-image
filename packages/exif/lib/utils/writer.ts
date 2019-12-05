import {IBufferLike, IWriter, Endian, IWriterOptions} from '../utils/types'

export class Writer implements IWriter {
  private readonly _bytes: number[] | IBufferLike
  private _position: number
  private _endianness: Endian

  public constructor(buffer?: IBufferLike, options: IWriterOptions = {}) {
    this._bytes = []
    this._position = 0
    this._endianness = Endian.Big

    if (buffer) {
      if (options.dangerouslyAvoidCopy) this._bytes = buffer
      else this.writeBuffer(buffer)
    }
  }

  public getPosition(): number {
    return this._position
  }

  public setEndianess(endian: Endian): void {
    this._endianness = endian
  }

  public write(data: number | string, length: number = 1): void {
    if (typeof data === 'string') {
      for (let i = 0; i < data.length; i++) {
        this._bytes[this._position] = data.charCodeAt(i)
        this._position++
      }

      this._bytes[this._position] = 0
      this._position++
      return
    }

    if (data > Math.pow(256, length)) throw new Error(`Cannot fit ${data} into ${length} bytes`)
    if (length > 4) throw new Error('Cannot write more than 4 bytes at once')

    if (this._endianness === Endian.Little) {
      this._writeLE(data, length)
    } else {
      this._writeBE(data, length)
    }
  }

  private _writeLE(data: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this._bytes[this._position] = 0xff & (data >> (i * 8))
      this._position++
    }
  }

  private _writeBE(data: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this._bytes[this._position] = 0xff & (data >> (8 * (length - i - 1)))
      this._position++
    }
  }

  public writeBuffer(buffer: IBufferLike): void {
    for (let i = 0; i < buffer.length; i++) {
      this._bytes[this._position] = buffer[i]
      this._position++
    }
  }

  public skip(diff: number): void {
    this._position = this._position + diff
  }

  public seek(position: number): void {
    this._position = position
  }

  public toBuffer(): IBufferLike {
    return new Uint8Array(this._bytes)
  }

  public static spliceBufferRange(
    buffer: Buffer,
    replacement: Buffer,
    start: number,
    end: number,
  ): Buffer {
    const preamble = buffer.slice(0, start)
    const postamble = buffer.slice(end)
    return Buffer.concat([preamble, replacement, postamble])
  }
}
