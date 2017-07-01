const patterns = {
  make: /^(\w+)/,
  focalLength: /\b(\d+(-\d+)?mm)\b/,
  aperature: /\b(F[\d.]+(-[\d.]+)?)\b/,
}

function parseLens(data) {
  const lensModel = data.tags.LensModel
  if (!lensModel) {
    return null
  }

  const output = {model: lensModel}
  // eslint-disable-next-line guard-for-in
  for (const key in patterns) {
    const match = lensModel.match(patterns[key])
    output[key] = match && match[1]
  }

  return output
}

module.exports = parseLens
