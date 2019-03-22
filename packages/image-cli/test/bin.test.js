const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const execa = require('execa')

const CWD = path.join(__dirname, '..')
const JS_EXE = path.join(__dirname, '../bin/run.js')
const FREEFORM_SCRIPT_PATH = path.join(__dirname, 'fixtures/freeform.js')
const CONFIG_PATH = path.join(__dirname, 'fixtures/config.json')
const ANALYSIS_PATH = path.join(__dirname, 'fixtures/actual-skater-analysis.json')
const SKATER_PATH = path.join(__dirname, 'fixtures/skater.jpg')

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

  it('should run from a freeform config', async () => {
    const args = ['-c', FREEFORM_SCRIPT_PATH, '--mode=freeform', SKATER_PATH]
    const stdout = await execa.stdout(JS_EXE, args, {cwd: CWD})
    expect(stdout.replace(/File is .*/, 'File is <file>')).to.equal([
      'File is <file>',
      'Processing 1 ...',
      'Processing 2 ...',
      'Processing 3 ...',
      'Processing 4 ...',
      'Processing 5 ...',
      'Done!'
    ].join('\n'))
  })
})
