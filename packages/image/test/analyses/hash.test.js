const hashModule = require('../../dist/analyses/hash')
const {expect, fixtureDecode} = require('../utils')

describe('#analyses/hash', () => {
  const skaterPromise = fixtureDecode('source-skater.jpg')
  const sydneyPromiseA = fixtureDecode('source-sydney-in-focus.jpg')
  const sydneyPromiseB = fixtureDecode('source-sydney-out-focus.jpg')
  const facePromiseA = fixtureDecode('source-face-sharp.jpg')
  const facePromiseB = fixtureDecode('source-face-blurry.jpg')

  describe('#computeDCT', () => {
    it('should compute the DCT of a gradient', () => {
      const image = {
        width: 4,
        height: 4,
        data: [
          255, 128, 64, 32,
          255, 128, 64, 32,
          255, 128, 64, 32,
          255, 128, 64, 32,
        ],
      }

      const dct = hashModule.computeDCT(image).map(x => Math.round(Math.abs(x)))
      const expectation = [
        239, 163, 47, 19,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
      ]

      expect(dct).toEqual(expectation)
    })

    it('should compute the DCT of a high-frequency image', () => {
      const image = {
        width: 4,
        height: 4,
        data: [
          0, 255, 0, 255,
          255, 0, 255, 0,
          0, 255, 0, 255,
          255, 0, 255, 0,
        ],
      }

      // TODO: validate these are actually right
      const dct = hashModule.computeDCT(image).map(x => Math.round(Math.abs(x)))
      const expectation = [
        255, 0, 0, 0,
        0, 37, 0, 90,
        0, 0, 0, 0,
        0, 90, 0, 218,
      ]

      expect(dct).toEqual(expectation)
    })
  })

  describe('#reduceDCT', () => {
    it('should keep only high frequency data', () => {
      const fullDct = [
        1, 3, 4, 10,
        2, 5, 9, 11,
        6, 8, 12, 15,
        7, 13, 14, 16,
      ]

      const dct = hashModule.reduceDCT(fullDct, 2)
      const expectation = [
        1, 3,
        2, 5,
      ]

      expect(dct).toEqual(expectation)
    })
  })

  describe('#averageAndThreshold', () => {
    it('should convert the array to bits', () => {
      const array = [
        255, 10, 10, 10,
        10, 10, 10, 10,
        0, 0, 0, 0,
        10, 0, 0, 0,
      ]

      const result = hashModule.averageAndThreshold(array)
      expect(result).toEqual(`1111111100001000`)
    })
  })

  describe('#phash', () => {
    it('should hash an image', async () => {
      const imageData = await skaterPromise
      const hash = hashModule.phash(imageData)
      expect(parseInt(hash, 2).toString(16)).toBe('c5b7535fe4cb7000')
    })

    it('should support larger hashes', async () => {
      const imageData = await skaterPromise
      const hash = hashModule.toHexString(hashModule.phash(imageData, 256))
      expect(hash).toBe('f1e21800a188a1f11c63dc63dc63dce8e695b1803182a0e8c21591b0903880')
    })

    it('should be resilient to minor image changes', async () => {
      const imageA = await sydneyPromiseA
      const imageB = await sydneyPromiseB

      const hashA = hashModule.phash(imageA)
      const hashB = hashModule.phash(imageB)

      const distance = hashModule.hammingDistance(hashA, hashB)
      // 62 of 64 bits match
      expect(distance).toBe(2)
    })

    it('should match similar images closely', async () => {
      const imageA = await facePromiseA
      const imageB = await facePromiseB

      const hashA = hashModule.phash(imageA)
      const hashB = hashModule.phash(imageB)

      const distance = hashModule.hammingDistance(hashA, hashB)
      // 61 of 64 bits match
      expect(distance).toBe(3)
    })

    it('should distinguish different images', async () => {
      const imageA = await sydneyPromiseA
      const imageB = await skaterPromise

      const hashA = hashModule.phash(imageA)
      const hashB = hashModule.phash(imageB)

      const distance = hashModule.hammingDistance(hashA, hashB)
      // 29 of 64 bits match
      expect(distance).toBe(35)
    })
  })
})
