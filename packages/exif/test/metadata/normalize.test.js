const normalizeMetadata = require('../../dist/metadata/normalize').normalizeMetadata

describe('lib/metadata/normalize.js', () => {
  describe('#normalizeMetadata', () => {
    it('should set width and height', () => {
      const metadata = {Orientation: 1, ImageWidth: 3000, ImageLength: 4000}
      const result = normalizeMetadata(metadata)
      expect(result).toMatchObject({width: 3000, height: 4000})
    })

    it('should flip width and height when orientation is 90/270', () => {
      const metadata = {Orientation: 6, ImageWidth: 3000, ImageLength: 4000}
      const result = normalizeMetadata(metadata)
      expect(result).toMatchObject({width: 4000, height: 3000})
    })

    it('should handle ISO-like dates', () => {
      const metadata = {
        CreateDate: '2014-04-01T09:23:43.29',
        ModifyDate: '2014-04-01T09:23:43.29-01:00',
      }
      const result = normalizeMetadata(metadata)
      expect(result).toMatchObject({
        createdAt: new Date('2014-04-01T09:23:43.290Z'),
        modifiedAt: new Date('2014-04-01T10:23:43.290Z'),
      })
    })

    it('should handle colon spaced dates', () => {
      const metadata = {
        CreateDate: '2014:04:01 09:23:43',
        ModifyDate: '2014:04:01 10:23:43',
      }
      const result = normalizeMetadata(metadata)
      expect(result).toMatchObject({
        createdAt: new Date('2014-04-01T09:23:43.000Z'),
        modifiedAt: new Date('2014-04-01T10:23:43.000Z'),
      })
    })
  })
})
