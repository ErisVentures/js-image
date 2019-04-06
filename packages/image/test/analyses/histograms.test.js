const histogramsModule = require('../../dist/analyses/histograms')
const {expect, fixtureDecode} = require('../utils')

describe('analyses/histograms', () => {
  let skaterImageData
  let rainbowImageData

  beforeAll(async () => {
    skaterImageData = await fixtureDecode('source-skater.jpg')
    rainbowImageData = await fixtureDecode('source-rainbow.jpg')
  })

  describe('histograms()', () => {
    it('should work on rainbows', () => {
      const result = histogramsModule.histograms(rainbowImageData)
      expect(result).eql({
        hue: [5473, 4493, 4569, 8280, 7879, 4656, 4650, 9552],
        lightness: [5726, 5559, 4877, 19078, 23381, 3103, 2195, 1106],
        saturation: [919, 4794, 4839, 4788, 4852, 4785, 4479, 35569],
      })
    })

    it('should work on skaters', () => {
      const result = histogramsModule.histograms(skaterImageData)
      expect(result).eql({
        hue: [1607, 2237, 508, 550, 22318, 1328, 209, 214],
        lightness: [13493, 7799, 2981, 1946, 4597, 7818, 13936, 12966],
        saturation: [2114, 7438, 12082, 17345, 17490, 9027, 40, 0],
      })
    })
  })
})
