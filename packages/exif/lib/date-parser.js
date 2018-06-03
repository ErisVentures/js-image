const isColonDate = s => /^\d+:\d+:\d+ \d+:\d+:\d+$/.test(s)

function parseNumericDate(timestamp) {
  return new Date(timestamp * 1000)
}

function parseColonDate(date) {
  const parts = date.split(' ')
  const dayPart = parts[0].replace(/:/g, '-')
  const timePart = parts[1]
  return new Date(`${dayPart}T${timePart}Z`)
}

function parseDate(date) {
  let parsed = null
  if (typeof date === 'number') {
    parsed = parseNumericDate(date)
  } else if (isColonDate(date)) {
    parsed = parseColonDate(date)
  }

  return parsed && parsed.getTime() ? parsed : null
}

module.exports = parseDate
