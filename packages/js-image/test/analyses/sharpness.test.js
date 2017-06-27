const sobel = require('../../lib/transforms/sobel').sobel
const canny = require('../../lib/transforms/canny').canny
const sharpness = require('../../lib/analyses/sharpness').sharpness
const ImageData = require('../../lib/image-data').ImageData
const {expect, fixtureDecode, compareToFixture, buildLinesImageData} = require('../utils')

describe('#analyses/sharpness', () => {
  const skaterPromise = fixtureDecode('source-skater.jpg')

  it('should compute the sharpness of a sharp horizontal line', () => {
    const originalData = buildLinesImageData(21, 21, [9, 10, 11])
    const smallData = buildLinesImageData(7, 7, [3])
    const maskData = sobel(smallData)

    const result = sharpness(originalData, maskData, {})
    expect(result).to.eql({
      width: 7,
      height: 7,
      data: new Uint8Array([
        0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0,
        0, 255, 255, 255, 255, 255, 0,
        0, 0, 0, 0, 0, 0, 0,
        0, 255, 255, 255, 255, 255, 0,
        0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0,
      ]),
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
    const smallData = buildLinesImageData(7, 7, [3])
    const maskData = sobel(smallData)

    const result = sharpness(originalData, maskData, {})
    expect(result).to.eql({
      width: 7,
      height: 7,
      data: new Uint8Array([
        0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0,
        0, 128, 128, 128, 128, 128, 0,
        0, 0, 0, 0, 0, 0, 0,
        0, 128, 128, 128, 128, 128, 0,
        0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0,
      ]),
    })
  })

  it('should work on an image', () => {
    return skaterPromise.then(imageData => {
      const edgeMask = canny(imageData)
      const result = sharpness(imageData, edgeMask, {})
      const output = ImageData.toRGBA(ImageData.normalize(result))
      return compareToFixture(output, 'skater-sharpness-v0.jpg')
    })
  })
})
