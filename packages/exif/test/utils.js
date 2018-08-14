const fs = require('fs')
const memoize = require('lodash/memoize')
const chai = require('chai')
chai.use(require('sinon-chai'))

const expect = chai.expect
const fixturePath = path => `${__dirname}/fixtures/${path}`
const fixture = memoize(path => fs.readFileSync(fixturePath(path)))

function compareToFixture(buffer, path) {
  fs.writeFileSync(fixturePath(`actual-${path}`), buffer)
  if (process.env.UPDATE_EXPECTATIONS) {
    fs.writeFileSync(fixturePath(path), buffer)
  }

  const expectedData = fixture(path)
  expect(buffer.length).to.equal(expectedData.length)
}

module.exports = {
  expect,
  fixture,
  fixturePath,
  compareToFixture,
}
