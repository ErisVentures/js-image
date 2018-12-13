const path = require('path')
const chai = require('chai')
const Client = require('../dist/lib/client').CLIClient

const expect = chai.expect
chai.use(require('chai-as-promised'))

const fixturePath = name => path.join(__dirname, 'fixtures/', name)

describe('lib/client.js', () => {
  describe('.run', () => {
    it('should handle missing executable', () => {
      const client = new Client({executablePath: './made-up'})
      const promise = client.run().waitForExit()
      return expect(promise).to.eventually.be.rejectedWith(/ENOENT/)
    })

    it('should handle failing executable', () => {
      const client = new Client({executablePath: fixturePath('fail.js')})
      return client
        .run()
        .waitForExit()
        .then(() => expect.fail(null, null, 'Promise should have failed'))
        .catch(err => {
          expect(err.message).to.match(/exit code 1/)
          expect(err.stdout).to.match(/Here is stdout/)
          expect(err.stderr).to.match(/This fails/)
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
        expect(entries).to.have.length(1)
        expect(entries[0])
          .to.have.property('result')
          .that.includes({width: 256, height: 256})
      })
    })

    it('should work with filed-based config', () => {
      const client = new Client()
      const config = fixturePath('config.json')

      const promise = client.run(config).waitForExit()
      return promise.then(entries => {
        expect(entries).to.have.length(4)
        expect(entries[1]).to.have.property('failed', true)
        expect(entries[1]).to.have.property('message')
        expect(entries[1]).to.have.property('stack')
      })
    })

    it('should respect failLoudly', () => {
      const client = new Client()
      const config = fixturePath('config.json')
      const promise = client.run(config).waitForExit({failLoudly: true})
      return expect(promise).to.eventually.be.rejectedWith(/no such file/)
    })
  })
})
