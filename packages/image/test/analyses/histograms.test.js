const histogramsModule = require('../../dist/analyses/histograms')
const {expect, fixtureDecode} = require('../utils')

describe('analyses/histograms', () => {
  let skaterImageData
  let rainbowImageData

  before(async () => {
    skaterImageData = await fixtureDecode('source-skater.jpg')
    rainbowImageData = await fixtureDecode('source-rainbow.jpg')
  })

  describe('histograms()', () => {
    it('should work on rainbows', () => {
      const result = histogramsModule.histograms(rainbowImageData)
      expect(result).eql({
        hue: [12391, 10738, 11104, 16946, 17382, 11136, 11113, 19103],
        lightness: [5726, 5559, 4877, 19078, 23381, 3103, 2195, 1106],
        saturation: [7357, 5084, 3866, 3378, 3128, 3137, 2969, 36106],
      })
    })

    it('should work on skaters', () => {
      const result = histogramsModule.histograms(skaterImageData)
      expect(result).eql({
        hue: [1379, 1568, 567, 446, 29105, 1877, 265, 180],
        lightness: [13493, 7799, 2981, 1946, 4597, 7818, 13936, 12966],
        saturation: [12816, 10829, 12026, 21279, 4569, 673, 310, 3034],
      })
    })
  })
})
