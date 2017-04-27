const fs = require('fs')
const memoize = require('lodash/memoize')
const chai = require('chai')
chai.use(require('sinon-chai'))

global.expect = chai.expect
global.fixture = memoize(path => fs.readFileSync(`${__dirname}/fixtures/${path}`))
