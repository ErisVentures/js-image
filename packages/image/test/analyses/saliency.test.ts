import {saliency} from '../../lib/analyses/saliency'
import {fixtureDecode, compareToFixture} from '../utils'

describe('#analyses/saliency', () => {
  it('should quantize a book image', async () => {
    const options = {}
    const {quantized, blocks} = await saliency(await fixtureDecode('source-book.png'), options)
    await compareToFixture(quantized, 'quantized-book.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })
})
