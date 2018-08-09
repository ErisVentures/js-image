const RawDecoder = require('raw-decoder').Decoder
const JPEGDecoder = require('./jpeg-decoder')
const parseDate = require('./date-parser')
const parseLens = require('./lens-parser')

const properties = {
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

function getResultValue(item, results) {
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

function mapResults(results) {
  const output = {_raw: results}

  // eslint-disable-next-line guard-for-in
  for (const key in properties) {
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

function isLikelyTIFF(byte) {
  return byte === 0x4949 || byte === 0x4d4d
}

function parse(buffer) {
  let decoder
  if (typeof buffer.extractMetadata === 'function') {
    decoder = buffer
  } else if (isLikelyTIFF((buffer[0] << 8) | buffer[1])) {
    decoder = new RawDecoder(buffer)
  } else {
    decoder = new JPEGDecoder(buffer)
  }

  return mapResults(decoder.extractMetadata())
}

module.exports = parse
