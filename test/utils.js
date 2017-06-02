const fs = require('fs')
const memoize = require('lodash/memoize')
const chai = require('chai')
const jpeg = require('@ouranos/jpeg-js')
const ImageData = require('../lib/image-data').ImageData
chai.use(require('sinon-chai'))

const expect = chai.expect
const fixturePath = path => `${__dirname}/fixtures/${path}`
const fixture = memoize(path => fs.readFileSync(fixturePath(path)))
const fixtureDecode = memoize(path => ImageData.from(fixture(path)))

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

function compareToFixture(bufferOrImageData, path, options) {
  options = Object.assign({
    strict: true,
    tolerance: 5,
    increment: 1,
  }, options)

  return Promise.resolve(bufferOrImageData)
    .then(buffer => {
      let imageData = buffer
      const expectedImageData = fixtureDecode(path)
      if (ImageData.probablyIs(bufferOrImageData)) {
        buffer = ImageData.toBuffer(imageData)
      } else {
        imageData = ImageData.from(buffer)
      }

      return Promise.all([buffer, imageData, expectedImageData])
    })
    .then(([buffer, imageData, expectedImageData]) => {
      fs.writeFileSync(fixturePath(`actual-${path}`), buffer)
      if (process.env.UPDATE_EXPECTATIONS) {
        fs.writeFileSync(fixturePath(path), buffer)
      }


      const diff = getImageDiff(imageData, expectedImageData, options.increment)
      if (options.strict) {
        expect(diff).to.equal(0)
      } else {
        const tolerance = Number(process.env.LOOSE_COMPARISON_TOLERANCE) || options.tolerance
        const area = imageData.width * imageData.height
        expect(diff).to.be.lessThan(tolerance * area / options.increment)
      }
    })
}

function testImage(Image, srcPath, fixturePath, modify, ...args) {
  return modify(Image.from(fixture(srcPath))).toBuffer().then(buffer => {
    return compareToFixture(buffer, fixturePath, ...args)
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
