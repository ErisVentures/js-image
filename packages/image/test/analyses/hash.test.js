const hashModule = require('../../dist/analyses/hash')
const {sobel} = require('../../dist/transforms/sobel')
const {normalize} = require('../../dist/transforms/normalize')
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
      expect(hash).toBe('f10e218000a188a1f11c63dc63dc63dce8e695b1803182a0e8c21591b0903880')
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

  describe('#lumaHash', () => {
    let skaterSobel
    let sydneySobelA
    let sydneySobelB
    let faceSobelA
    let faceSobelB

    beforeAll(async () => {
      skaterSobel = sobel(await skaterPromise)
      sydneySobelA = sobel(await sydneyPromiseA)
      sydneySobelB = sobel(await sydneyPromiseB)
      faceSobelA = sobel(await facePromiseA)
      faceSobelB = sobel(await facePromiseB)
    })

    it('should hash an image', async () => {
      const hash = hashModule.toHexString(hashModule.lumaHash(skaterSobel))
      expect(hash).toMatchInlineSnapshot(
        `"0000f840fc00fd80ff80ffb8fb70fb70fb70ffdfffdfe7e0bc233e3c7b409b80"`,
      )
    })

    it('should support larger hashes', async () => {
      const hash = hashModule.toHexString(hashModule.lumaHash(skaterSobel, {hashSize: 1024}))
      expect(hash).toMatchInlineSnapshot(
        `"000000001c0020003f0020007fc070007fc01000fee00000fff00000fff78000ffffc000fdffc0007ddfc500fddf8f80fdc71f00fdc53c00fdc52400fdc52780fdc52780fde5b400ffede61fffffe1fee7fff0d0e63ff37fc0000878f87ffc00fff01c0707f80507079807b00f8c0e00198e180031863000c187c00081de0000"`,
      )
    })

    it('should be resilient to minor image changes', async () => {
      const imageA = await sydneySobelA
      const imageB = await sydneySobelB

      const hashA = hashModule.lumaHash(imageA)
      const hashB = hashModule.lumaHash(imageB)

      expect(hashModule.subsetDistance(hashA, hashB)).toMatchInlineSnapshot(`0.07142857142857142`)
    })

    it('should match similar images closely', async () => {
      const imageA = await faceSobelA
      const imageB = await faceSobelB

      const hashA = hashModule.lumaHash(imageA)
      const hashB = hashModule.lumaHash(imageB)

      expect(hashModule.subsetDistance(hashA, hashB)).toMatchInlineSnapshot(`0.21621621621621623`)
    })

    it('should match similar edge images closely', async () => {
      const imageA = sobel(await fixtureDecode('source-wedding-1.jpg'))
      const imageB = sobel(await fixtureDecode('source-wedding-2.jpg'))

      const hashA = hashModule.lumaHash(normalize(imageA))
      const hashB = hashModule.lumaHash(normalize(imageB))

      expect(hashModule.subsetDistance(hashA, hashB)).toMatchInlineSnapshot(`0.04697986577181208`)
    })

    it('should distinguish different images', async () => {
      const imageA = await sydneySobelA
      const imageB = await skaterSobel

      const hashA = hashModule.lumaHash(imageA)
      const hashB = hashModule.lumaHash(imageB)

      expect(hashModule.subsetDistance(hashA, hashB)).toMatchInlineSnapshot(`0.24285714285714285`)
    })
  })
})
