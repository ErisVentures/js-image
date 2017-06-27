const _ = require('lodash')
const resize = require('../../lib/transforms/resize')
const ImageData = require('../../lib/image-data').ImageData
const {expect, fixtureDecode, compareToFixture} = require('../utils')

describe('#transforms/resize', () => {
  const yosemitePromise = fixtureDecode('yosemite-portrait.jpg').then(ImageData.normalize)

  describe('#nearestNeighbor', () => {
    it('should resize mock data', () => {
      const input = {
        channels: 1,
        width: 4,
        height: 4,
        data: _.range(1, 33, 2),
      }

      const output = resize.nearestNeighbor(input, {width: 2, height: 2})
      expect(output.data).to.eql(new Uint8Array([
        1, 5,
        17, 21,
      ]))
    })

    it('should resize an actual image', () => {
      return yosemitePromise.then(yosemite => {
        const output = resize.nearestNeighbor(yosemite, {width: 100, height: 125})
        return compareToFixture(ImageData.toBuffer(output), 'yosemite-nearest-neighbor.jpg')
      })
    })
  })

  describe('#bilinear', () => {
    it('should resize mock data', () => {
      const input = {
        channels: 1,
        width: 3,
        height: 3,
        data: [
          1, 3, 5,
          7, 9, 11,
          13, 15, 17,
        ],
      }

      const output = resize.bilinear(input, {width: 2, height: 2})
      expect(output.data).to.eql(new Uint8Array([
        1, (3 + 5) / 2,
        (7 + 13) / 2, (9 + 11 + 15 + 17) / 4,
      ]))
    })

    it('should resize an actual image', () => {
      return yosemitePromise.then(yosemite => {
        const output = resize.bilinear(yosemite, {width: 600, height: 750})
        return compareToFixture(ImageData.toBuffer(output), 'yosemite-bilinear-minor.jpg')
      })
    })

    it('should drastically resize an actual image', () => {
      return yosemitePromise.then(yosemite => {
        const output = resize.bilinear(yosemite, {width: 100, height: 125})
        return compareToFixture(ImageData.toBuffer(output), 'yosemite-bilinear-drastic.jpg')
      })
    })
  })

  describe('#box', () => {
    it('should resize mock data', () => {
      const input = {
        channels: 1,
        width: 4,
        height: 4,
        data: _.range(1, 33, 2),
      }

      const output = resize.box(input, {width: 2, height: 2})
      expect(output.data).to.eql(new Uint8Array([
        6, 10,
        22, 26,
      ]))
    })
  })
})
