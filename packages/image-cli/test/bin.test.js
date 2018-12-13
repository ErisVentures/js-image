const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const execa = require('execa')

const CWD = path.join(__dirname, '..')
const JS_EXE = path.join(__dirname, '../bin/run.js')
const CONFIG_PATH = path.join(__dirname, 'fixtures/config.json')
const ANALYSIS_PATH = path.join(__dirname, 'fixtures/actual-skater-analysis.json')

describe('bin/index.js', () => {
  it('should run from a file config', () => {
    const args = ['-c', CONFIG_PATH]
    return execa.stdout(JS_EXE, args, {cwd: CWD}).then(stdout => {
      expect(stdout).to.include('has finished')
      expect(stdout).to.include('errored')

      const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH))
      expect(analysis).to.have.property('hash').a('string')
      expect(analysis).to.have.property('sharpness').an('object')
    })
  })
})
