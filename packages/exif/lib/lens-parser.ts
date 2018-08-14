import {IParsedLens} from './utils/types'

const patterns = {
  make: /^(\w+)/,
  focalLength: /\b(\d+(-\d+)?mm)\b/,
  aperture: /\b(F[\d.]+(-[\d.]+)?)\b/,
}

function exec(s: string, regex: RegExp): string | undefined {
  const match = s.match(regex)
  return (match && match[1]) || undefined
}

// TODO: remove these anys
export function parseLens(data: any): IParsedLens | undefined {
  const lensModel = data.LensModel
  if (!lensModel) {
    return undefined
  }

  return {
    model: lensModel,
    make: exec(lensModel, patterns.make),
    focalLength: exec(lensModel, patterns.focalLength),
    aperture: exec(lensModel, patterns.aperture),
  }
}
