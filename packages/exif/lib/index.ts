import {Decoder as RawDecoder} from 'raw-decoder'
import {parseDate} from './date-parser'
import {JPEGDecoder} from './jpeg-decoder'
import {parseLens} from './lens-parser'

type ParseFn = (results: any) => any

type PropertyDefn = string | [string, ParseFn] | ParseFn

const properties: {[k: string]: PropertyDefn[]} = {
  make: ['Make'],
  model: ['Model'],

  width: ['ImageWidth'],
  height: ['ImageHeight'],
  xResolution: ['XResolution'],
  yResolution: ['YResolution'],

  createdAt: [['DateTimeOriginal', parseDate], ['CreateDate', parseDate]],
  modifiedAt: [['ModifyDate', parseDate]],

  iso: ['ISO'],
  exposureTime: ['ExposureTime'],
  fNumber: ['FNumber'],
  focalLength: ['FocalLength', 'FocalLengthIn35mmFormat'],
  normalizedFocalLength: ['FocalLengthIn35mmFormat', 'FocalLength'],

  exposureCompensation: ['ExposureCompensation'],

  lens: [parseLens],
}

function isRawDecoder<T>(obj: T): boolean {
  return typeof (obj as any).extractMetadata === 'function'
}

function getResultValue(item: PropertyDefn, results: any): any {
  if (typeof item === 'string') {
    return results[item]
  } else if (typeof item === 'function') {
    return item(results)
  } else if (Array.isArray(item)) {
    const value = getResultValue(item[0], results)
    return item[1](value)
  } else {
    throw new TypeError(`Unsupported item: ${item}`)
  }
}

// TODO: remove these anys
function mapResults(results: any): any {
  const output: any = {_raw: results}

  for (const key of Object.keys(properties)) {
    const candidates = properties[key]
    let value = null
    for (const candidate of candidates) {
      value = getResultValue(candidate, results)
      if (typeof value !== 'undefined' && value !== null) {
        break
      }
    }

    output[key] = value
  }

  return output
}

function isLikelyTIFF(byte: number): boolean {
  return byte === 0x4949 || byte === 0x4d4d
}

export function parse(buffer: any): any {
  let decoder
  if (isRawDecoder(buffer)) {
    decoder = buffer
  } else if (isLikelyTIFF((buffer[0] << 8) | buffer[1])) {
    decoder = new RawDecoder(buffer)
  } else {
    decoder = new JPEGDecoder(buffer)
  }

  return mapResults(decoder.extractMetadata())
}
