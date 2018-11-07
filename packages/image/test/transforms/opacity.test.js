const {opacity} = require('../../dist/transforms/opacity')
const {expect} = require('../utils')

describe('#transforms/opacity', () => {
  it('should merge the two images', () => {
    const background = {
      width: 2,
      height: 2,
      channels: 3,
      colorspace: 'rgb',
      data: new Uint8Array([
        255, 255, 255, 255, 255, 255,
        255, 255, 255, 255, 255, 255,
      ]),
    }

    const foreground = {
      width: 2,
      height: 2,
      channels: 3,
      colorspace: 'rgb',
      data: new Uint8Array([
        255, 0, 0, 0, 255, 0,
        0, 0, 255, 0, 0, 0,
      ]),
    }

    const result = opacity(background, foreground, 0.5)

    expect(result).to.eql({
      width: 2,
      height: 2,
      channels: 3,
      colorspace: 'rgb',
      data: new Uint8Array([
        255, 128, 128, 128, 255, 128,
        128, 128, 255, 128, 128, 128,
      ]),
    })
  })
})
