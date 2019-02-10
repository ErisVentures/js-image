const sobel = require('../../dist/transforms/sobel').sobel
const composition = require('../../dist/analyses/composition').composition
const {expect, fixtureDecode, buildLinesImageData} = require('../utils')

describe('analyses/composition', () => {
  const realImageData = {}

  before(async () => {
    realImageData.skater = await fixtureDecode('source-skater.jpg')
    realImageData.yosemite = await fixtureDecode('source-yosemite.jpg')
    realImageData.sydney = await fixtureDecode('source-sydney.jpg')
    realImageData.face = await fixtureDecode('source-face-sharp.jpg')
    realImageData.texture = await fixtureDecode('source-texture.jpg')
    realImageData.ruleOfThirds = await fixtureDecode('source-rule-of-thirds-ideal.jpg')
  })

  describe('ruleOfThirds()', () => {
    const compute = imageData => Math.round(100 * composition(imageData).ruleOfThirds) / 100

    it('should compute the ruleOfThirds of well composed image', () => {
      const originalData = buildLinesImageData(60, 60, [
        {row: 20, value: 255},
        {row: 40, value: 255},
      ])
      const edgeData = sobel(originalData)

      const result = compute(edgeData)
      expect(result).to.eql(0.5)
    })

    it('should compute the ruleOfThirds of poorly composed image', () => {
      const originalData = buildLinesImageData(60, 60, [
        {row: 1, value: 255},
        {row: 59, value: 255},
      ])
      const edgeData = sobel(originalData)

      const result = compute(edgeData)
      expect(result).to.eql(0)
    })

    it('should compute the ruleOfThirds of real images', () => {
      const results = {}
      for (const [key, imageData] of Object.entries(realImageData)) {
        const edgeData = sobel(imageData)
        results[key] = compute(edgeData)
      }

      expect(results).to.eql({
        skater: 0.28,
        yosemite: 0.25,
        sydney: 0.31,
        face: 0.24,
        texture: 0.16,
        ruleOfThirds: 0.48,
      })
    })
  })
})
