const fs = require('fs')
const memoize = require('lodash/memoize')
const chai = require('chai')
const jpeg = require('jpeg-js')
const ImageData = require('../lib/image-data').ImageData
chai.use(require('sinon-chai'))

const expect = chai.expect
const fixturePath = path => `${__dirname}/fixtures/${path}`
const fixture = memoize(path => fs.readFileSync(fixturePath(path)))
const fixtureDecode = memoize(path => jpeg.decode(fixture(path)))

function getImageDiff(actual, expectation, increment = 1) {
  if (actual.data) {
    actual = actual.data
  }

  if (expectation.data) {
    expectation = expectation.data
  }

  expect(actual.length).to.equal(expectation.length, 'lengths differ')

  let diff = 0
  for (let i = 0; i < actual.length; i += increment) {
    const individualDiff = Math.abs(actual[i] - expectation[i])
    diff += individualDiff
  }

  return diff
}

function compareToFixture(bufferOrImageData, path, looseTolerance, increment = 1) {
  let buffer = bufferOrImageData
  let imageData = bufferOrImageData
  if (ImageData.probablyIs(bufferOrImageData)) {
    buffer = ImageData.toBuffer(bufferOrImageData)
  } else {
    imageData = ImageData.from(bufferOrImageData)
  }

  fs.writeFileSync(fixturePath(`actual-${path}`), buffer)
  if (process.env.UPDATE_EXPECTATIONS) {
    fs.writeFileSync(fixturePath(path), buffer)
  }

  const expectedImageData = fixtureDecode(path)
  const diff = getImageDiff(imageData, expectedImageData, increment)
  if (looseTolerance || process.env.LOOSE_COMPARISON) {
    expect(diff).to.be.lessThan(5 * imageData.width * imageData.height / increment)
  } else {
    expect(diff).to.equal(0)
  }
}

function testImage(Image, srcPath, fixturePath, modify, ...args) {
  return modify(Image.from(fixture(srcPath))).toBuffer().then(buffer => {
    compareToFixture(buffer, fixturePath, ...args)
  })
}

module.exports = {
  expect,
  fixture,
  fixturePath,
  fixtureDecode,
  compareToFixture,
  getImageDiff,
  testImage,
}
