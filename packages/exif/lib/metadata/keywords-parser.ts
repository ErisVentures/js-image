import {IParsedLens, IGenericMetadata} from '../utils/types'

const patterns = {
  make: /^(\w+)/,
  focalLength: /\b(\d+(-\d+)?mm)\b/,
  aperture: /\b(F[\d.]+(-[\d.]+)?)\b/,
}

function exec(s: string, regex: RegExp): string | undefined {
  const match = s.match(regex)
  return (match && match[1]) || undefined
}

export function parseKeywords(data: IGenericMetadata): string[] | undefined {
  if (typeof data.DCSubjectBagOfWords !== 'string') return undefined

  try {
    return JSON.parse(data.DCSubjectBagOfWords)
  } catch (_) {
    return undefined
  }
}
