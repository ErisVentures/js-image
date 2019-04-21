import * as histogramsModule from '../../dist/analyses/histograms'
import {fixtureDecode} from '../utils'

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
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hue": Array [
            6498,
            4503,
            4579,
            7788,
            8403,
            4666,
            4660,
            8554,
          ],
          "lightness": Array [
            5807,
            5535,
            4856,
            35301,
            7153,
            3100,
            2195,
            1078,
          ],
          "saturation": Array [
            853,
            4791,
            4987,
            4761,
            4838,
            4819,
            4460,
            35516,
          ],
        }
      `)
    })

    it('should work on skaters', () => {
      const result = histogramsModule.histograms(skaterImageData)
      expect(result).toMatchInlineSnapshot(`
        Object {
          "hue": Array [
            1608,
            2237,
            508,
            551,
            22346,
            1319,
            209,
            214,
          ],
          "lightness": Array [
            13663,
            7721,
            2910,
            1976,
            4629,
            7884,
            13979,
            12774,
          ],
          "saturation": Array [
            2051,
            7484,
            12278,
            17339,
            17474,
            8879,
            31,
            0,
          ],
        }
      `)
    })
  })
})
