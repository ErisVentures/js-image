const {expect} = require('../utils')
const normalizeMetadata = require('../../dist/metadata/normalize').normalizeMetadata

describe('lib/metadata/normalize.js', () => {
  describe('#normalizeMetadata', () => {
    it('should set width and height', () => {
      const metadata = {Orientation: 1, ImageWidth: 3000, ImageLength: 4000}
      const result = normalizeMetadata(metadata)
      expect(result).to.include({width: 3000, height: 4000})
    })

    it('should flip width and height when orientation is 90/270', () => {
      const metadata = {Orientation: 6, ImageWidth: 3000, ImageLength: 4000}
      const result = normalizeMetadata(metadata)
      expect(result).to.include({width: 4000, height: 3000})
    })
  })
})
