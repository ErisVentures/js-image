import {blockify, hueColorDistance_} from '../../lib/effects/blockify'
import {fixtureDecode, compareToFixture, roundNumbersToHundredths} from '../utils'
import {createPRNG} from '../../lib/third-party/alea'
import {Colorspace} from '../../lib/types'

describe.skip('#effects/blockify', () => {
  it('should blockify an portrait image', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData, blocks} = await blockify(
      await fixtureDecode('source-faces-couple.jpg'),
      options,
    )
    await compareToFixture(imageData, 'blockify-faces-couple.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })

  it('should blockify a landscape image', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData, blocks} = await blockify(await fixtureDecode('source-yosemite.jpg'), options)
    await compareToFixture(imageData, 'blockify-yosemite.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })

  it('should blockify a skater image', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData, blocks} = await blockify(await fixtureDecode('source-skater.jpg'), options)
    await compareToFixture(imageData, 'blockify-skater.jpg', {strict: false, tolerance: 10})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })

  it('should blockify a sydney image', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData} = await blockify(await fixtureDecode('source-sydney.jpg'), options)
    await compareToFixture(imageData, 'blockify-sydney.jpg', {strict: false, tolerance: 10})
  })

  it('should blockify a night image', async () => {
    const options = {
      recolorAfterMerge: true,
      mergeThresholdMultiplier: 1.5,
      minimumBlockSize: 0.001,
    }
    const {imageData} = await blockify(await fixtureDecode('source-sydney-in-focus.jpg'), options)
    await compareToFixture(imageData, 'blockify-sydney-night.jpg', {strict: false})
  })

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

    roundNumbersToHundredths(blocks)
    expect(blocks).toEqual([
      {b: 0, count: 0.28, g: 0, height: 0.67, r: 233, width: 0.67, x: 0, y: 0},
      {b: 228, count: 0.36, g: 0, height: 1, r: 0, width: 1, x: 0, y: 0},
      {b: 0, count: 0.36, g: 230, height: 0.67, r: 0, width: 0.67, x: 0.33, y: 0.33},
    ])
  })

  it('should merge blocks', async () => {
    const r2 = (v: number) => [v, 0, 0]
    const pixels = [
      ...[...r2(199), ...r2(190), ...r2(181), ...r2(190)],
      ...[...r2(190), ...r2(181), ...r2(190), ...r2(190)],
      ...[...r2(181), ...r2(190), ...r2(190), ...r2(190)],
      ...[...r2(190), ...r2(190), ...r2(190), ...r2(190)],
    ].map(r => Math.round(r))

    const expected = new Uint8Array(
      [
        ...[...r2(193), ...r2(193), ...r2(188), ...r2(188)],
        ...[...r2(193), ...r2(188), ...r2(188), ...r2(188)],
        ...[...r2(188), ...r2(188), ...r2(188), ...r2(188)],
        ...[...r2(188), ...r2(188), ...r2(188), ...r2(188)],
      ].map(r => Math.round(r)),
    )

    const input = {width: 4, height: 4, data: pixels, colorspace: Colorspace.RGB, channels: 3}
    const nonMergeOptions = {
      threshold: 10,
      blurRadius: 0,
      mergeThresholdMultiplier: 0,
      recolorAfterMerge: true,
    }
    const mergeOptions = {...nonMergeOptions, mergeThresholdMultiplier: 1}
    const {imageData: nonMergeData, blocks: nonMergeBlocks} = await blockify(input, nonMergeOptions)
    expect(nonMergeData.data).toEqual(expected)
    const {imageData: mergeData, blocks: mergeBlocks} = await blockify(input, mergeOptions)
    expect(mergeData.data).toEqual(expected.map((_, i) => (i % 3 === 0 ? 193 : 0)))
    expect(mergeBlocks).toHaveLength(1)
    expect(nonMergeBlocks.length).toBeGreaterThan(mergeBlocks.length)
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
    const {blocks} = await blockify(imageData, {blurRadius: 0, mergeThresholdMultiplier: 0})
    expect(blocks.length).toBeGreaterThan(200 * 300 * 0.9)
  })

  describe('#hueColorDistance_', () => {
    it('should have lower distance for similar hues', () => {
      expect(hueColorDistance_([255, 0, 0], [230, 0, 0])).toMatchInlineSnapshot(`6.25`)
      // Blue hues in couple shot
      expect(hueColorDistance_([5, 31, 50], [44, 74, 94])).toMatchInlineSnapshot(
        `18.750146410036507`,
      )
      expect(hueColorDistance_([5, 31, 50], [83, 92, 106])).toMatchInlineSnapshot(
        `35.51060927299831`,
      )
      expect(hueColorDistance_([44, 74, 94], [83, 92, 106])).toMatchInlineSnapshot(
        `14.252035472972741`,
      )
      // Green hues in couple shot
      expect(hueColorDistance_([76, 86, 38], [39, 45, 6])).toMatchInlineSnapshot(
        `17.116240695322528`,
      )
      expect(hueColorDistance_([76, 86, 38], [97, 110, 61])).toMatchInlineSnapshot(
        `10.576509912425898`,
      )
      expect(hueColorDistance_([39, 45, 6], [97, 110, 61])).toMatchInlineSnapshot(
        `29.583761175197303`,
      )
      // Green vs brown
      expect(hueColorDistance_([132, 103, 80], [39, 45, 6])).toMatchInlineSnapshot(
        `64.42753014331821`,
      )
      expect(hueColorDistance_([175, 140, 115], [79, 80, 40])).toMatchInlineSnapshot(
        `61.48615528447576`,
      )
    })
  })
})
