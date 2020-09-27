import {saliency} from '../../lib/analyses/saliency'
import {fixtureDecode, compareToFixture} from '../utils'

describe('#analyses/saliency', () => {
  it('should quantize a book image', async () => {
    const options = {}
    const {imageData, blocks} = await saliency(await fixtureDecode('source-skater.jpg'), options)

    await compareToFixture(imageData, 'saliency-skater.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })
})
