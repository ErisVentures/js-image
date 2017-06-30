const sobel = require('../../lib/transforms/sobel').sobel
const sharpness = require('../../lib/analyses/sharpness').sharpness
const {expect, fixtureDecode, buildLinesImageData} = require('../utils')

describe('#analyses/sharpness', () => {
  const infocusPromise = fixtureDecode('source-sydney-in-focus.jpg')
  const outfocusPromise = fixtureDecode('source-sydney-out-focus.jpg')

  it('should compute the sharpness of a sharp horizontal line', () => {
    const originalData = buildLinesImageData(21, 21, [9, 10, 11])
    const edgeData = sobel(originalData)

    const result = sharpness(edgeData)
    result.percentEdges = Math.round(result.percentEdges * 1000) / 1000
    expect(result).to.eql({
      percentEdges: 0.172,
      lowerQuartile: 255,
      median: 255,
      upperQuartile: 255,
      lowerVentileAverage: 255,
      average: 255,
      upperVentileAverage: 255,
    })
  })

  it('should compute the sharpness of a blurry horizontal line', () => {
    const originalData = buildLinesImageData(21, 21, [
      {row: 7, value: 32},
      {row: 8, value: 64},
      {row: 9, value: 128},
      {row: 10, value: 192},
      {row: 11, value: 128},
      {row: 12, value: 64},
      {row: 13, value: 32},
    ])
    const edgeData = sobel(originalData)

    const result = sharpness(edgeData)
    result.percentEdges = Math.round(result.percentEdges * 1000) / 1000
    expect(result).to.eql({
      percentEdges: 0.345,
      lowerQuartile: 64,
      median: 96,
      upperQuartile: 128,
      lowerVentileAverage: 32,
      average: 80,
      upperVentileAverage: 128,
    })
  })

  it('should work on an image', () => {
    return Promise.all([infocusPromise, outfocusPromise])
      .then(([sharpImageData, blurImageData]) => {
        const sharpEdges = sobel(sharpImageData)
        const blurEdges = sobel(blurImageData)

        const sharpResult = sharpness(sharpEdges)
        const blurResult = sharpness(blurEdges)

        expect(Math.round(sharpResult.percentEdges * 100)).to.equal(4)
        expect(sharpResult.percentEdges).to.be.greaterThan(blurResult.percentEdges)
        expect(sharpResult.average).to.be.greaterThan(blurResult.average)
        expect(sharpResult.median).to.be.greaterThan(blurResult.median)
        expect(sharpResult.upperVentileAverage).to.be.greaterThan(blurResult.upperVentileAverage)
      })
  })
})
