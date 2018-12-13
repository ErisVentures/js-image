const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const sinon = require('sinon')
const Runner = require('../dist/lib/runner').Runner

const fixturePath = name => path.join(__dirname, `fixtures/${name}`)

describe('lib/runner.js', () => {
  const noop = () => undefined

  const reporterApi = {
    started: noop,
    finished: noop,
    entryStarted: noop,
    entryFinished: noop,
    entryErrored: noop,
  }

  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('.run', () => {
    it('should process images', () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: ':::in-memory',
        action: 'toBuffer',
        settings: {},
      }

      const runner = new Runner(reporterApi, [entry])
      const entryFinished = sandbox.stub(reporterApi, 'entryFinished')
      return runner.run().then(() => {
        expect(entryFinished.firstCall).to.be.ok
        const result = entryFinished.firstCall.args[1]
        expect(result.length).to.be.within(14000, 17000)
      })
    })

    it('should copy images', async () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: fixturePath('actual-skater-exact-copy.jpg'),
        toDisk: true,
        settings: {},
      }

      const runner = new Runner(reporterApi, [entry])
      const entryFinished = sandbox.stub(reporterApi, 'entryFinished')
      await runner.run()
      const actual = fs.readFileSync(fixturePath('actual-skater-exact-copy.jpg'))
      const actualReported = entryFinished.firstCall.args[1]
      const expected = fs.readFileSync(fixturePath('skater.jpg'))
      expect(actual).to.eql(expected)
      expect(actualReported).to.eql(expected)
    })

    it('should process metadata', () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: ':::in-memory',
        action: 'toMetadata',
        settings: {},
      }

      const runner = new Runner(reporterApi, [entry])
      const entryFinished = sandbox.stub(reporterApi, 'entryFinished')
      return runner.run().then(() => {
        expect(entryFinished.firstCall).to.be.ok
        const result = entryFinished.firstCall.args[1]
        expect(result).to.have.property('width', 256)
        expect(result).to.have.property('exif')
      })
    })

    it('should process analysis', () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: ':::in-memory',
        action: 'toAnalysis',
        settings: {
          analyze: {hash: {}, sharpness: {}},
        },
      }

      const runner = new Runner(reporterApi, [entry])
      const entryFinished = sandbox.stub(reporterApi, 'entryFinished')
      return runner.run().then(() => {
        expect(entryFinished.firstCall).to.be.ok
        const result = entryFinished.firstCall.args[1]
        expect(result)
          .to.have.property('hash')
          .a('string')
        expect(result.sharpness).to.have.property('median', 75)
      })
    })

    it('should process multiple files with one config', async () => {
      const config = {
        input: '<%= file.path %>',
        output: '<%= file.dirname %>/actual-<%= file.basenameWithoutExtension %>-preview.jpg',
        action: 'toBuffer',
        toDisk: true,
        toReporter: false,
        settings: {},
      }

      const files = [fixturePath('skater.jpg'), fixturePath('sydney.jpg')]

      const runner = new Runner(reporterApi, [config])

      await runner.run(files)

      expect(fs.existsSync(fixturePath('actual-skater-preview.jpg'))).to.equal(true)
      expect(fs.existsSync(fixturePath('actual-sydney-preview.jpg'))).to.equal(true)
    })
  })
})
