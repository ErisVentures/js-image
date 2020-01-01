import {blockify} from '../../lib/effects/blockify'
import {fixtureDecode, compareToFixture} from '../utils'
import {createPRNG} from '../../lib/third-party/alea'
import {Colorspace} from '../../lib/types'

describe('#effects/blockify', () => {
  it('should blockify an image', async () => {
    const {imageData} = await blockify(await fixtureDecode('source-faces-couple.jpg'))
    await compareToFixture(imageData, 'blockify-faces-couple.jpg')
  }, 60000)

  it('should blockify a small square of same colors', async () => {
    const random = createPRNG('blockify')
    const red = (v?: number) => [v || 230 + (random.next() - 0.5) * 30, 0, 0]
    const green = (v?: number) => [0, v || 230 + (random.next() - 0.5) * 30, 0]
    const blue = (v?: number) => [0, 0, v || 230 + (random.next() - 0.5) * 30]
    const pixels = [
      ...[...red(), ...red(), ...red(), ...red(), ...blue(), ...blue()],
      ...[...red(), ...red(), ...red(), ...blue(), ...blue(), ...blue()],
      ...[...red(), ...red(), ...blue(), ...blue(), ...green(), ...green()],
      ...[...red(), ...blue(), ...blue(), ...green(), ...green(), ...green()],
      ...[...blue(), ...blue(), ...green(), ...green(), ...green(), ...green()],
      ...[...blue(), ...blue(), ...green(), ...green(), ...green(), ...green()],
    ].map(r => Math.round(r))

    const expected = new Uint8Array(
      [
        ...[...red(233), ...red(233), ...red(233), ...red(233), ...blue(228), ...blue(228)],
        ...[...red(233), ...red(233), ...red(233), ...blue(228), ...blue(228), ...blue(228)],
        ...[...red(233), ...red(233), ...blue(228), ...blue(228), ...green(230), ...green(230)],
        ...[...red(233), ...blue(228), ...blue(228), ...green(230), ...green(230), ...green(230)],
        ...[...blue(228), ...blue(228), ...green(230), ...green(230), ...green(230), ...green(230)],
        ...[...blue(228), ...blue(228), ...green(230), ...green(230), ...green(230), ...green(230)],
      ].map(r => Math.round(r)),
    )

    const input = {width: 6, height: 6, data: pixels, colorspace: Colorspace.RGB, channels: 3}
    const {imageData, blocks} = await blockify(input, {threshold: 30, blurRadius: 0})
    expect(imageData.data).toEqual(expected)
    expect(blocks).toEqual([
      {b: 0, count: 10, g: 0, height: 4, r: 233, width: 4, x: 0, y: 0},
      {b: 228, count: 13, g: 0, height: 6, r: 0, width: 6, x: 0, y: 0},
      {b: 0, count: 13, g: 230, height: 4, r: 0, width: 4, x: 2, y: 2},
    ])
  })

  it('should blockify a large rectangle of random colors', async () => {
    const random = createPRNG('blockify')
    const color = () => [random.next() * 255, random.next() * 255, random.next() * 255]
    const pixels = []
    const width = 200
    const height = 300
    for (let i = 0; i < width * height; i++) {
      pixels.push(...color())
    }

    const imageData = {width, height, data: pixels, colorspace: Colorspace.RGB, channels: 3}
    const {blocks} = await blockify(imageData, {blurRadius: 0})
    expect(blocks.length).toBeGreaterThan(200 * 300 * 0.9)
  })
})
