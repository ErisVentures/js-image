import {Decoder as RawDecoder} from './decoder/decoder'
import {parseDate} from './date-parser'
import {JPEGDecoder} from './jpeg-decoder'
import {parseLens} from './lens-parser'
import {INormalizedMetadata, IGenericMetadata, IFDTagName} from './utils/types'

type ParseFn = (results: any) => any

type PropertyDefn = IFDTagName | [IFDTagName, ParseFn] | ParseFn

const properties: {[k: string]: PropertyDefn[]} = {
  // TODO: look into how to normalize GPS coordinates
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

function getResultValue(item: PropertyDefn, results: IGenericMetadata): any {
  if (typeof item === 'string') {
    return results[item as IFDTagName]
  } else if (typeof item === 'function') {
    return item(results)
  } else if (Array.isArray(item)) {
    const value = getResultValue(item[0], results)
    return item[1](value)
  } else {
    throw new TypeError(`Unsupported item: ${item}`)
  }
}

function mapResults(results: IGenericMetadata): INormalizedMetadata {
  const output: INormalizedMetadata = {_raw: results}

  for (const key of Object.keys(properties)) {
    const candidates = properties[key]
    let value = undefined
    for (const candidate of candidates) {
      value = getResultValue(candidate, results)
      if (typeof value !== 'undefined') {
        break
      }
    }

    output[key as keyof INormalizedMetadata] = value
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

export {Decoder} from './decoder/decoder'
