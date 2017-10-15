const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const execa = require('execa')

const JS_EXE = path.join(__dirname, '../bin/index.js')
const CONFIG_PATH = path.join(__dirname, 'fixtures/config.json')
const ANALYSIS_PATH = path.join(__dirname, 'fixtures/actual-skater-analysis.json')

describe('bin/index.js', () => {
  it('should run from a file config', () => {
    const args = ['-c', CONFIG_PATH]
    return execa.stdout(JS_EXE, args).then(stdout => {
      expect(stdout).to.include('has finished')

      const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH))
      expect(analysis).to.have.property('hash').a('string')
      expect(analysis).to.have.property('sharpness').an('object')
    })
  })
})
