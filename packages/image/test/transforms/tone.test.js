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
      expect(contrast({value: 100, channel: 'y'})).to.equal(72)
      expect(contrast({value: 150, channel: 'y'})).to.equal(172)
    })

    it('should decrease contrast', () => {
      const contrast = toneModule.contrast({contrast: -0.5})
      expect(contrast({value: 100, channel: 'y'})).to.equal(114)
      expect(contrast({value: 150, channel: 'y'})).to.equal(139)
    })

    it('should do nothing to color components', () => {
      const contrast = toneModule.contrast({contrast: 1})
      expect(contrast({value: 100, channel: 'r'})).to.equal(100)
      expect(contrast({value: 150, channel: 'cb'})).to.equal(150)
    })
  })

  describe('#curves', () => {
    it('should hold in identity case', () => {
      const curve = toneModule.curves({curve: []})
      expect(curve({value: 100, channel: 'y'})).to.equal(100)
      expect(curve({value: 150, channel: 'y'})).to.equal(150)
    })

    it('should apply basic linear interpolation', () => {
      const curve = toneModule.curves({curve: [[0, 50], [255, 200]]})
      expect(curve({value: 0, channel: 'y'})).to.equal(50)
      expect(Math.round(curve({value: 128, channel: 'y'}))).to.equal(125)
      expect(curve({value: 255, channel: 'y'})).to.equal(200)
    })

    it('should apply basic cubic interpolation', () => {
      const curve = toneModule.curves({curve: [[0, 0], [50, 40], [205, 215], [255, 255]]})
      expect(Math.round(curve({value: 0, channel: 'y'}))).to.equal(0)
      expect(Math.round(curve({value: 40, channel: 'y'}))).to.equal(31)
      expect(Math.round(curve({value: 50, channel: 'y'}))).to.equal(40)
      expect(Math.round(curve({value: 90, channel: 'y'}))).to.equal(82)
      expect(Math.round(curve({value: 128, channel: 'y'}))).to.equal(128)
      expect(Math.round(curve({value: 195, channel: 'y'}))).to.equal(205)
      expect(Math.round(curve({value: 205, channel: 'y'}))).to.equal(215)
      expect(Math.round(curve({value: 215, channel: 'y'}))).to.equal(224)
      expect(Math.round(curve({value: 255, channel: 'y'}))).to.equal(255)
    })
  })
})
