import {parseDate} from '../metadata/date-parser'
import {parseLens} from '../metadata/lens-parser'
import {INormalizedMetadata, IGenericMetadata, IFDTagName} from '../utils/types'

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

export function normalizeMetadata(results: IGenericMetadata): INormalizedMetadata {
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
