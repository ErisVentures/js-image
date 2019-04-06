const path = require('path')
const Client = require('../dist/lib/client').CLIClient

const fixturePath = name => path.join(__dirname, 'fixtures/', name)

describe('lib/client.js', () => {
  describe('.run', () => {
    it('should handle missing executable', () => {
      const client = new Client({executablePath: './made-up'})
      const promise = client.run().waitForExit()
      return expect(promise).rejects.toThrow('ENOENT')
    })

    it('should handle failing executable', () => {
      const client = new Client({executablePath: fixturePath('fail.js')})
      return client
        .run()
        .waitForExit()
        .then(() => expect.fail(null, null, 'Promise should have failed'))
        .catch(err => {
          expect(err.message).toMatch(/exit code 1/)
          expect(err.stdout).toMatch(/Here is stdout/)
          expect(err.stderr).toMatch(/This fails/)
        })
    })

    it('should work with object-based config', () => {
      const client = new Client()
      const config = {
        input: fixturePath('skater.jpg'),
        output: ':::memory',
        action: 'toMetadata',
        toReporter: true,
      }

      const promise = client.run(config).waitForExit()
      return promise.then(entries => {
        expect(entries).toHaveLength(1)
        expect(entries[0].result).toMatchObject({width: 256, height: 256})
      })
    })

    it('should work with filed-based config', () => {
      const client = new Client()
      const config = fixturePath('config.json')

      const promise = client.run(config).waitForExit()
      return promise.then(entries => {
        expect(entries).toHaveLength(4)
        expect(entries[1]).toHaveProperty('error')
        expect(entries[1].error).toHaveProperty('message')
        expect(entries[1].error).toHaveProperty('stack')
      })
    })

    it('should respect failLoudly', () => {
      const client = new Client()
      const config = fixturePath('config.json')
      const promise = client.run(config).waitForExit({failLoudly: true})
      return expect(promise).rejects.toThrow('no such file')
    })
  })
})
