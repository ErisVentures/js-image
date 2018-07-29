const {subselect} = require('../../dist/transforms/subselect')
const {expect} = require('../utils')

describe('#transforms/subselect', () => {
  it('should select a submatrix', () => {
    const imageData = {
      width: 5,
      height: 5,
      channels: 3,
      data: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 2, 3, 1, 2, 3, 1, 2, 3, 0, 0, 0,
        0, 0, 0, 1, 2, 3, 1, 2, 3, 1, 2, 3, 0, 0, 0,
        0, 0, 0, 1, 2, 3, 1, 2, 3, 1, 2, 3, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    }

    const result = subselect(imageData, {
      top: 1,
      bottom: 4,
      left: 1,
      right: 4,
    })
    expect(result).to.eql({
      width: 3,
      height: 3,
      channels: 3,
      data: new Uint8Array([
        1, 2, 3, 1, 2, 3, 1, 2, 3,
        1, 2, 3, 1, 2, 3, 1, 2, 3,
        1, 2, 3, 1, 2, 3, 1, 2, 3,
      ]),
    })
  })
})
