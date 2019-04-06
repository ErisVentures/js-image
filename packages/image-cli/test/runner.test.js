const fs = require('fs')
const path = require('path')
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

  beforeEach(() => {
    reporterApi.entryFinished = jest.fn()
  })

  describe('.run', () => {
    it('should process images', async () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: ':::in-memory',
        action: 'toBuffer',
        settings: {},
      }

      const runner = new Runner(reporterApi, [entry])
      await runner.run()

      expect(reporterApi.entryFinished).toHaveBeenCalled()
      const result = reporterApi.entryFinished.mock.calls[0][1]
      expect(result.length).toBeGreaterThanOrEqual(14000)
      expect(result.length).toBeLessThanOrEqual(17000)
    })

    it('should copy images', async () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: fixturePath('actual-skater-exact-copy.jpg'),
        toDisk: true,
        settings: {},
      }

      const runner = new Runner(reporterApi, [entry])
      await runner.run()
      const actual = fs.readFileSync(fixturePath('actual-skater-exact-copy.jpg'))
      const actualReported = reporterApi.entryFinished.mock.calls[0][1]
      const expected = fs.readFileSync(fixturePath('skater.jpg'))
      expect(actual).toHaveLength(expected.length)
      expect(actualReported).toHaveLength(expected.length)
    })

    it('should process metadata', () => {
      const entry = {
        input: fixturePath('skater.jpg'),
        output: ':::in-memory',
        action: 'toMetadata',
        settings: {},
      }

      const runner = new Runner(reporterApi, [entry])
      return runner.run().then(() => {
        expect(reporterApi.entryFinished).toHaveBeenCalled()
        const result = reporterApi.entryFinished.mock.calls[0][1]
        expect(result).toHaveProperty('width', 256)
        expect(result).toHaveProperty('exif')
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
      return runner.run().then(() => {
        expect(reporterApi.entryFinished).toHaveBeenCalled()
        const result = reporterApi.entryFinished.mock.calls[0][1]
        expect(typeof result.hash).toBe('string')
        expect(result.sharpness).toHaveProperty('median', 75)
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

      expect(fs.existsSync(fixturePath('actual-skater-preview.jpg'))).toBe(true)
      expect(fs.existsSync(fixturePath('actual-sydney-preview.jpg'))).toBe(true)
    })
  })
})
