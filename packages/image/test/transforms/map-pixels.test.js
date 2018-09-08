const {mapPixels} = require('../../dist/transforms/map-pixels')
const {expect} = require('../utils')

describe('#transforms/map-pixels', () => {
  it('should evaluate the function', () => {
    const imageData = {
      width: 1,
      height: 1,
      channels: 3,
      data: [1, 2, 3],
    }

    const result = mapPixels(imageData, ({value}) => value + 1)

    expect(result).to.eql({
      width: 1,
      height: 1,
      channels: 3,
      data: new Uint8Array([2, 3, 4]),
    })
  })

  it('should evaluate the functions in order', () => {
    const imageData = {
      width: 1,
      height: 1,
      channels: 1,
      data: [10],
    }

    const result = mapPixels(imageData, [({value}) => value / 2, ({value}) => value + 2])

    expect(result).to.eql({
      width: 1,
      height: 1,
      channels: 1,
      data: new Uint8Array([7]),
    })
  })
})
