export interface ILogger {
  (...args: any[]): void
  verbose(...args: any[]): void
}

export type IBufferLike = Buffer | Uint8Array

export enum Endian {
  Big,
  Little,
}

export interface IReader {
  hasNext(): boolean
  getPosition(): number
  setEndianess(endian: Endian): void
  read(length: number): number
  readAsBuffer(length: number): IBufferLike
  readAsReader(length: number): IReader
  skip(diff: number): void
  seek(position: number): void
  use<T>(func: () => T): T
}

export interface IIFD {
  offset: number
  nextIFDOffset: number
  parent?: IIFD
  children: IIFD[]
  entries: IIFDEntry[]

  isEXIF: boolean
}

export interface IIFDEntry {
  tag: number
  dataType: number
  length: number
  getValue(reader?: IReader): string | number
}

export interface IIFDOffset {
  offset: number
  parent?: IIFD
}

export enum IFDTag {
  ImageWidth = 100,
  XResolution = 282,
  YResolution = 283,
  SubIFD = 330,
  ThumbnailOffset = 513,
  ThumbnailLength = 514,
  EXIFOffset = 34665,
}

export interface IGenericMetadata {
  [key: string]: string | number | null
}

export enum IFDDataType {
  Unknown = 0,
  Byte = 1,
  String = 2,
  Word = 3,
  DoubleWord = 4,
  RationalNumber = 5,
  OtherRationalNumber = 10,
}
