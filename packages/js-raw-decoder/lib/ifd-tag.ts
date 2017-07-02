// tslint:disable
const exifMap = require('exif-parser/lib/exif-tags').exif

export enum IfdTag {
  ImageWidth = 100,
  XResolution = 282,
  YResolution = 283,
  SubIFD = 330,
  ThumbnailOffset = 513,
  ThumbnailLength = 514,
  ExifOffset = 34665,
}

export function getFriendlyName(code: number): string {
  return exifMap[code] as string
}
