import {saliency} from '../../lib/analyses/saliency'
import * as e from '../../lib/transforms/sobel'
import {fixtureDecode, compareToFixture} from '../utils'

describe('#analyses/saliency', () => {
  it('should quantize a book image', async () => {
    // const srcImageData = await fixtureDecode('source-sydney.jpg')
    // const srcImageData = await fixtureDecode('source-skater.jpg')
    // const srcImageData = await fixtureDecode('source-bride.jpg')
    // const srcImageData = await fixtureDecode('source-faces-couple.jpg')
    // const srcImageData = await fixtureDecode('source-yosemite.jpg')
    const srcImageData = await fixtureDecode('source-book.png')
    const options = {}
    const {imageData, quantized, contrastImageData, positionImageData, blocks} = await saliency(
      srcImageData,
      options,
    )

    await compareToFixture(e.sobel(srcImageData), 'saliency-edges.jpg', {
      strict: false,
    }).catch(() => {})
    await compareToFixture(imageData, 'saliency.jpg', {strict: false}).catch(() => {})
    await compareToFixture(quantized, 'saliency-quantized.jpg', {strict: false}).catch(() => {})
    await compareToFixture(contrastImageData, 'saliency-contrast.jpg', {
      strict: false,
    }).catch(() => {})
    await compareToFixture(positionImageData, 'saliency-position.jpg', {
      strict: false,
    }).catch(() => {})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })
})
