const fs = require('fs')
const path = require('path')
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
      expect(stdout).toContain('has finished')
      expect(stdout).toContain('errored')

      const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH))
      expect(typeof analysis.hash).toBe('string')
      expect(typeof analysis.sharpness).toBe('object')
    })
  })

  it('should run from a freeform config', async () => {
    const args = ['-c', FREEFORM_SCRIPT_PATH, '--mode=freeform', SKATER_PATH]
    const stdout = await execa.stdout(JS_EXE, args, {cwd: CWD})
    const stdoutClean = stdout.replace(/.* read in/, '<file> read in').replace(/\d+ms/g, 'Xms')
    expect(stdoutClean).toMatchInlineSnapshot(`
      "EXIF is passed-through ✓
      <file> read in Xms ✓
      Metadata processed in Xms ✓
      Image data read in Xms ✓
      Processing 1 ...
      Processing 2 ...
      Processing 3 ...
      Processing 4 ...
      Processing 5 ...
      Subslices processed in Xms ✓
      Done! Took Xms!"
    `)
  })
})
