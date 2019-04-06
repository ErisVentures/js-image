const path = require('path')
const ConfigEntry = require('../dist/lib/config-entry')

const fixturePath = name => path.join(__dirname, `fixtures/${name}`)

describe('lib/config-entry.js', () => {
  describe('#readAllFrom', () => {
    it('should read from disk', () => {
      const entries = ConfigEntry.readAllFrom(fixturePath('config.json'))
      expect(entries).toHaveLength(4)

      for (const entry of entries) {
        expect(typeof entry.id).toBe('number')
        expect(typeof entry.input).toBe('string')
        expect(typeof entry.output).toBe('string')
        expect(typeof entry.settings).toBe('object')
        expect(typeof entry.toDisk).toBe('boolean')
        expect(typeof entry.toReporter).toBe('boolean')
      }
    })

    it('should read from object', () => {
      const config = {input: 'in', output: 'out', action: 'toBuffer'}
      const entries = ConfigEntry.readAllFrom(config)
      expect(entries).toHaveLength(1)
      expect(entries[0].input).toBe('in')
      expect(entries[0].output).toBe('out')
      expect(entries[0].action).toBe('toBuffer')
    })

    it('should read from object string', () => {
      const config = {input: 'in', output: 'out', action: 'toBuffer'}
      const entries = ConfigEntry.readAllFrom(JSON.stringify(config))
      expect(entries).toHaveLength(1)
      expect(entries[0].input).toBe('in')
      expect(entries[0].output).toBe('out')
      expect(entries[0].action).toBe('toBuffer')
    })

    it('should read from array string', () => {
      const config = [
        {input: 'in', output: 'out', action: 'toBuffer'},
        {input: 'in', output: 'out', action: 'toMetadata'},
      ]

      const entries = ConfigEntry.readAllFrom(JSON.stringify(config))
      expect(entries).toHaveLength(2)
      expect(entries[0].action).toBe('toBuffer')
      expect(entries[1].action).toBe('toMetadata')
    })

    it('should validate configs', () => {
      expect(() => ConfigEntry.readAllFrom([{}])).toThrowError(/is not defined/)
      expect(() => ConfigEntry.readAllFrom([null])).toThrowError(/is not defined/)
    })
  })
})
