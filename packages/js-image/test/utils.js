const fs = require('fs')
const memoize = require('lodash/memoize')
const chai = require('chai')
chai.use(require('sinon-chai'))

module.exports = {
  expect: chai.expect,
  fixture: memoize(path => fs.readFileSync(`${__dirname}/fixtures/${path}`)),
}
