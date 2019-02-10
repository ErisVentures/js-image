const ImageData = require('../../dist/image-data').ImageData
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

  const round = x => Math.round(100 * x) / 100

  describe('ruleOfThirds()', () => {
    it('should compute the ruleOfThirds of well composed image', () => {
      const originalData = buildLinesImageData(60, 60, [
        {row: 20, value: 255},
        {row: 40, value: 255},
      ])
      const edgeData = sobel(originalData)

      expect(round(composition(edgeData).ruleOfThirds)).to.eql(0.5)
    })

    it('should compute the ruleOfThirds of poorly composed image', () => {
      const originalData = buildLinesImageData(60, 60, [
        {row: 1, value: 255},
        {row: 59, value: 255},
      ])
      const edgeData = sobel(originalData)

      expect(round(composition(edgeData).ruleOfThirds)).to.eql(0)
    })
  })

  describe('parallelism()', () => {
    it('should compute the parallelism of horizontal image', () => {
      const originalData = buildLinesImageData(300, 300, [
        {row: 50, value: 255},
        {row: 100, value: 255},
        {row: 150, value: 255},
      ])
      const edgeData = sobel(originalData)

      const {verticalParallelism, horizontalParallelism} = composition(edgeData)
      expect(round(horizontalParallelism)).to.eql(0.99)
      expect(round(verticalParallelism)).to.eql(0)
    })

    it('should compute the parallelism of vertical image', () => {
      const originalData = buildLinesImageData(300, 300, [
        {row: 50, value: 255},
        {row: 100, value: 255},
        {row: 150, value: 255},
      ])
      const edgeData = sobel(ImageData.rotate(originalData, 90))

      const {verticalParallelism, horizontalParallelism} = composition(edgeData)
      expect(round(horizontalParallelism)).to.eql(0)
      expect(round(verticalParallelism)).to.eql(0.99)
    })
  })

  it('should compute on real images', () => {
    const ruleOfThirds = {}
    const horizontalParallelism = {}
    const verticalParallelism = {}
    for (const [key, imageData] of Object.entries(realImageData)) {
      const edgeData = sobel(imageData)
      const result = composition(edgeData)
      ruleOfThirds[key] = round(result.ruleOfThirds)
      horizontalParallelism[key] = round(result.horizontalParallelism)
      verticalParallelism[key] = round(result.verticalParallelism)
    }

    expect(ruleOfThirds).to.eql({
      skater: 0.28,
      yosemite: 0.25,
      sydney: 0.31,
      face: 0.24,
      texture: 0.16,
      ruleOfThirds: 0.48,
    })

    expect(horizontalParallelism).to.eql({
      face: 0,
      ruleOfThirds: 0,
      skater: 0.08,
      sydney: 0.06,
      texture: 0,
      yosemite: 0,
    })

    expect(verticalParallelism).to.eql({
      face: 0.05,
      ruleOfThirds: 0.06,
      skater: 0.16,
      sydney: 0.07,
      texture: 0.08,
      yosemite: 0,
    })
  })
})
