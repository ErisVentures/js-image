const isColonDate = (s: string) => /^\d+:\d+:\d+ \d+:\d+:\d+$/.test(s)
const isISODateWithTz = (s: string) => /^\d{4}-\d{2}-\d{2}T[0-9.:]+(-|\+)\d{2}:\d{2}/.test(s)
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}T/.test(s)

function parseNumericDate(timestamp: number): Date {
  return new Date(timestamp * 1000)
}

function parseColonDate(date: string): Date {
  const parts = date.split(' ')
  const dayPart = parts[0].replace(/:/g, '-')
  const timePart = parts[1]
  return new Date(`${dayPart}T${timePart}Z`)
}

// TODO: Accept optional target timezone instead of assuming GMT with appending `Z`
export function parseDate(date: string | number): Date | undefined {
  let parsed = undefined
  if (typeof date === 'number') {
    parsed = parseNumericDate(date)
  } else if (isColonDate(date)) {
    parsed = parseColonDate(date)
  } else if (isISODateWithTz(date)) {
    parsed = new Date(date)
  } else if (isISODate(date)) {
    parsed = new Date(`${date}Z`)
  }

  return parsed && parsed.getTime() ? parsed : undefined
}
