import {JPEGDecoder} from './decoder/jpeg-decoder'
import {TIFFDecoder} from './decoder/tiff-decoder'
import {normalizeMetadata} from './metadata/normalize'

function isTIFFDecoder<T>(obj: T): boolean {
  return typeof (obj as any).extractMetadata === 'function'
}

function isLikelyTIFF(byte: number): boolean {
  return byte === 0x4949 || byte === 0x4d4d
}

export function parse(buffer: any): any {
  let decoder
  if (isTIFFDecoder(buffer)) {
    decoder = buffer
  } else if (isLikelyTIFF((buffer[0] << 8) | buffer[1])) {
    decoder = new TIFFDecoder(buffer)
  } else {
    decoder = new JPEGDecoder(buffer)
  }

  return normalizeMetadata(decoder.extractMetadata())
}

export {TIFFDecoder} from './decoder/tiff-decoder'
