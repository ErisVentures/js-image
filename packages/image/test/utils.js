jest.setTimeout(60000)

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const memoize = require('lodash/memoize')
const ImageData = require('../dist/image-data').ImageData
const {hasWASM, getWASM} = require('../dist/utils/env')
const {registerNodeWASM} = require('../dist/utils/node-wasm')

const environmentTolerance = Number(process.env.LOOSE_COMPARISON_TOLERANCE) || 0
const fixturePath = filePath => path.resolve(__dirname, 'fixtures', filePath)
const fixture = memoize(filePath => fs.readFileSync(fixturePath(filePath)))
const fixtureDecode = memoize(filePath => ImageData.from(fixture(filePath)))

function getImageDiff(actual, expectation, increment = 1) {
  if (actual.data) {
    actual = actual.data
  }

  if (expectation.data) {
    expectation = expectation.data
  }

  assert.equal(actual.length, expectation.length)

  let diff = 0
  for (let i = 0; i < actual.length; i += increment) {
    const individualDiff = Math.abs(actual[i] - expectation[i])
    diff += individualDiff
  }

  return diff
}

async function compareToFixture(bufferOrImageData, path, options) {
  options = Object.assign(
    {
      strict: true,
      tolerance: 5,
      increment: 1,
    },
    options,
  )

  let imageData = await bufferOrImageData
  let buffer = await bufferOrImageData
  if (ImageData.probablyIs(bufferOrImageData)) {
    imageData = ImageData.toColorspace(imageData, 'rgba')
    buffer = await ImageData.toBuffer(bufferOrImageData)
  } else {
    imageData = await ImageData.from(buffer)
    imageData = ImageData.toColorspace(imageData, 'rgba')
  }

  fs.writeFileSync(fixturePath(`actual-${path}`), buffer)
  if (process.env.UPDATE_EXPECTATIONS) {
    fs.writeFileSync(fixturePath(`expected-${path}`), buffer)
  }

  const expectedImageData = await fixtureDecode(`expected-${path}`)

  const diff = getImageDiff(imageData, expectedImageData, options.increment)
  if (options.strict) {
    expect(diff).toBe(0)
  } else {
    const tolerance = Math.max(environmentTolerance, options.tolerance)
    const area = imageData.width * imageData.height
    expect(diff).toBeLessThan((tolerance * area) / options.increment)
  }
}

function testImage(Image, srcPath, fixturePath, modify, ...args) {
  return modify(Image.from(fixture(srcPath)))
    .toBuffer()
    .then(buffer => {
      return compareToFixture(buffer, fixturePath, ...args)
    })
}

function printImageData(imageData) {
  for (let y = 0; y < imageData.height; y++) {
    const start = y * imageData.width
    const end = start + imageData.width
    console.log(imageData.data.slice(start, end))
  }
}

function buildLine(width, height, lineRow, value) {
  const pixels = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] = y === lineRow ? value : 0
    }
  }
  return pixels
}

function mergeLines(...dataObjects) {
  const pixels = new Uint8Array(dataObjects[0].length)
  dataObjects.forEach(data => {
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = Math.max(pixels[i], data[i])
    }
  })
  return pixels
}

function buildLinesImageData(width, height, lines) {
  const linesData = lines.map(line => {
    const row = typeof line === 'number' ? line : line.row
    const value = line.value || 255
    return buildLine(width, height, row, value)
  })

  return {
    width,
    height,
    channels: 1,
    colorspace: ImageData.GREYSCALE,
    data: mergeLines(...linesData),
  }
}

function roundNumbersToHundredths(o) {
  if (typeof o !== 'object') return
  for (const key of Object.keys(o)) {
    const value = o[key]
    if (typeof value === 'number') o[key] = Math.round(value * 100) / 100
    roundNumbersToHundredths(value)
  }
}

let _wasmModule
async function enableWASM() {
  if (_wasmModule) {
    global['@eris/image-wasm'] = _wasmModule
    return
  }

  await registerNodeWASM()
  if (!hasWASM()) throw new Error('WASM failed to instantiate')
  _wasmModule = getWASM()
}

function disableWASM() {
  global['@eris/image-wasm'] = undefined
}

module.exports = {
  expect,
  fixture,
  fixturePath,
  fixtureDecode,
  compareToFixture,
  getImageDiff,
  testImage,
  printImageData,
  buildLine,
  mergeLines,
  buildLinesImageData,
  enableWASM,
  disableWASM,
  roundNumbersToHundredths,
}
