const patterns = {
  make: /^(\w+)/,
  focalLength: /\b(\d+(-\d+)?mm)\b/,
  aperture: /\b(F[\d.]+(-[\d.]+)?)\b/,
}

function exec(s: string, regex: RegExp): string | null {
  const match = s.match(regex)
  return (match && match[1]) || null
}

// TODO: remove these anys
export function parseLens(data: any): any {
  const lensModel = data.LensModel
  if (!lensModel) {
    return null
  }

  return {
    model: lensModel,
    make: exec(lensModel, patterns.make),
    focalLength: exec(lensModel, patterns.focalLength),
    aperture: exec(lensModel, patterns.aperture),
  }
}
