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

  it('should respect existing alpha channel on solid background', () => {
    const background = {
      width: 2,
      height: 2,
      channels: 4,
      colorspace: 'rgba',
      data: new Uint8Array([
        255, 255, 255, 255, 255, 255, 255, 255,
        255, 255, 255, 255, 255, 255, 255, 255
      ]),
    }

    const foreground = {
      width: 2,
      height: 2,
      channels: 4,
      colorspace: 'rgba',
      data: new Uint8Array([
        0, 0, 0, 128, 0, 0, 0, 255,
        0, 0, 0, 64, 0, 0, 0, 8
      ]),
    }

    const result = opacity(background, foreground, 1)

    expect(result).to.eql({
      width: 2,
      height: 2,
      channels: 4,
      colorspace: 'rgba',
      data: new Uint8Array([
        127, 127, 127, 255, 0, 0, 0, 255,
        191, 191, 191, 255, 247, 247, 247, 255
      ]),
    })
  })

  it.skip('should respect existing alpha channel on semi-transparent background', () => {
    const background = {
      width: 2,
      height: 2,
      channels: 4,
      colorspace: 'rgba',
      data: new Uint8Array([
        255, 255, 255, 128, 255, 255, 255, 128,
        255, 255, 255, 128, 255, 255, 255, 128
      ]),
    }

    const foreground = {
      width: 2,
      height: 2,
      channels: 4,
      colorspace: 'rgba',
      data: new Uint8Array([
        0, 0, 0, 128, 0, 0, 0, 255,
        0, 0, 0, 64, 0, 0, 0, 8
      ]),
    }

    const result = opacity(background, foreground, 1)

    expect(result).to.eql({
      width: 2,
      height: 2,
      channels: 4,
      colorspace: 'rgba',
      data: new Uint8Array([
        127, 127, 127, 255, 0, 0, 0, 255,
        191, 191, 191, 255, 247, 247, 247, 255
      ]),
    })
  })
})
