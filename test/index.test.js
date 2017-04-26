const Image = require('../lib')

describe('index.js', () => {
  describe('#version', () => {
    it('should work', () => {
      expect(Image.version).to.be.ok
    })
  })
})
