import {blockify2} from '../../lib/effects/blockify-v2'
import {fixtureDecode, compareToFixture, roundNumbersToHundredths} from '../utils'
import {createPRNG} from '../../lib/third-party/alea'
import {Colorspace} from '../../lib/types'

describe('#effects/blockify-v2', () => {
  it('should blockify a book image', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData, blocks} = await blockify2(await fixtureDecode('source-book.png'), options)
    await compareToFixture(imageData, 'blockify-book.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })

  it('should blockify a book image the same way when its subtly reencoded', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData, blocks} = await blockify2(
      await fixtureDecode('source-book-reencode.png'),
      options,
    )
    await compareToFixture(imageData, 'blockify-book.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })
})
