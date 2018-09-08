const toneModule = require('../../dist/transforms/tone')
const {expect} = require('../utils')

describe('#transforms/tone', () => {
  describe('#mapPixels', () => {
    it('should evaluate the function', () => {
      const imageData = {
        width: 1,
        height: 1,
        channels: 3,
        data: [1, 2, 3],
      }

      const result = toneModule.mapPixels(imageData, ({value}) => value + 1)

      expect(result).to.eql({
        width: 1,
        height: 1,
        channels: 3,
        data: new Uint8Array([2, 3, 4]),
      })
    })

    it('should evaluate the functions in order', () => {
      const imageData = {
        width: 1,
        height: 1,
        channels: 1,
        data: [10],
      }

      const result = toneModule.mapPixels(imageData, [
        ({value}) => value / 2,
        ({value}) => value + 2,
      ])

      expect(result).to.eql({
        width: 1,
        height: 1,
        channels: 1,
        data: new Uint8Array([7]),
      })
    })
  })

  describe('#contrast', () => {
    it('should increase contrast', () => {
      const contrast = toneModule.contrast({contrast: 1})
      expect(contrast({value: 100})).to.equal(72)
      expect(contrast({value: 150})).to.equal(172)
    })

    it('should decrease contrast', () => {
      const contrast = toneModule.contrast({contrast: -0.5})
      expect(contrast({value: 100})).to.equal(114)
      expect(contrast({value: 150})).to.equal(139)
    })
  })
})
