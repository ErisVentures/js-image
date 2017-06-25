const hash = require('../../lib/analyses/hash')
const {expect, fixtureDecode} = require('../utils')

describe('#analyses/hash', () => {
  const skaterPromise = fixtureDecode('skater.jpg')
  const sydneyPromiseA = fixtureDecode('sydney-in-focus.jpg')
  const sydneyPromiseB = fixtureDecode('sydney-out-focus.jpg')

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

      const dct = hash.computeDCT(image)
      const expectation = new Uint8Array([
        239, 163, 47, 18,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
      ])

      expect(dct).to.eql(expectation)
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

      const dct = hash.computeDCT(image)
      const expectation = new Uint8Array([
        254, 0, 0, 0,
        0, 219, 0, 166,
        0, 0, 0, 0,
        0, 166, 0, 39,
      ])

      expect(dct).to.eql(expectation)
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

      const dct = hash.reduceDCT(fullDct, 2)
      const expectation = new Uint8Array([
        1, 3,
        2, 5,
      ])

      expect(dct).to.eql(expectation)
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

      const result = hash.averageAndThreshold(array)
      // eslint-disable-next-line unicorn/number-literal-case
      const expectation = new Uint8Array([0xff, 0x08])
      expect(result).to.eql(expectation)
    })
  })

  describe('#phash', () => {
    it('should hash an image', () => {
      return skaterPromise.then(imageData => {
        const hashBytes = hash.phash(imageData)
        const result = Buffer.from(hashBytes).toString('hex')
        expect(result).to.equal('ea26561bb48918d5')
      })
    })

    it('should support larger hashes', () => {
      return skaterPromise.then(imageData => {
        const hashBytes = hash.phash(imageData, 256)
        const result = Buffer.from(hashBytes).toString('hex')
        expect(result).to.equal('1b056d052ecad685bdf3c020b186126b9ab574170ba34019bbcec81d2f7adff5')
      })
    })

    it('should be resilient to minor image changes', () => {
      const images = [sydneyPromiseA, sydneyPromiseB]
      return Promise.all(images).then(([imageA, imageB]) => {
        const hashA = hash.phash(imageA)
        const hashB = hash.phash(imageB)

        const resultA = Buffer.from(hashA).toString('hex')
        expect(resultA).to.equal('2d12eb4f0e33b37e')

        const resultB = Buffer.from(hashB).toString('hex')
        expect(resultB).to.equal('ad12234f0e53b37f')

        const distance = hash.hammingDistance(hashA, hashB)
        expect(distance).to.be.lessThan(10)
      })
    })

    it('should distinguish different images', () => {
      const images = [sydneyPromiseA, skaterPromise]
      return Promise.all(images).then(([imageA, imageB]) => {
        const hashA = hash.phash(imageA)
        const hashB = hash.phash(imageB)

        const distance = hash.hammingDistance(hashA, hashB)
        expect(distance).to.be.greaterThan(30)
      })
    })
  })
})
