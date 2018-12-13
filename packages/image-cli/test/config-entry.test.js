const path = require('path')
const expect = require('chai').expect
const ConfigEntry = require('../dist/lib/config-entry')

const fixturePath = name => path.join(__dirname, `fixtures/${name}`)

describe('lib/config-entry.js', () => {
  describe('#readAllFrom', () => {
    it('should read from disk', () => {
      const entries = ConfigEntry.readAllFrom(fixturePath('config.json'))
      expect(entries).to.have.length(4)

      for (const entry of entries) {
        expect(entry.id).to.be.a('number')
        expect(entry.input).to.be.a('string')
        expect(entry.output).to.be.a('string')
        expect(entry.settings).to.be.an('object')
        expect(entry.toDisk).to.be.a('boolean')
        expect(entry.toReporter).to.be.a('boolean')
      }
    })

    it('should read from object', () => {
      const config = {input: 'in', output: 'out', action: 'toBuffer'}
      const entries = ConfigEntry.readAllFrom(config)
      expect(entries).to.have.length(1)
      expect(entries[0].input).to.equal('in')
      expect(entries[0].output).to.equal('out')
      expect(entries[0].action).to.equal('toBuffer')
    })

    it('should read from object string', () => {
      const config = {input: 'in', output: 'out', action: 'toBuffer'}
      const entries = ConfigEntry.readAllFrom(JSON.stringify(config))
      expect(entries).to.have.length(1)
      expect(entries[0].input).to.equal('in')
      expect(entries[0].output).to.equal('out')
      expect(entries[0].action).to.equal('toBuffer')
    })

    it('should read from array string', () => {
      const config = [
        {input: 'in', output: 'out', action: 'toBuffer'},
        {input: 'in', output: 'out', action: 'toMetadata'},
      ]

      const entries = ConfigEntry.readAllFrom(JSON.stringify(config))
      expect(entries).to.have.length(2)
      expect(entries[0].action).to.equal('toBuffer')
      expect(entries[1].action).to.equal('toMetadata')
    })

    it('should validate configs', () => {
      expect(() => ConfigEntry.readAllFrom([{}])).to.throw(/is not defined/)
      expect(() => ConfigEntry.readAllFrom([null])).to.throw(/is not defined/)
    })
  })
})
