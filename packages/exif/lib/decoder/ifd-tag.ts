// tslint:disable
const exifMap = require('exif-parser/lib/exif-tags').exif

export function getFriendlyName(code: number): string {
  return exifMap[code] as string
}
