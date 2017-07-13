const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const parse = require('../lib')

const fixture = filePath => fs.readFileSync(path.join(__dirname, 'fixtures', filePath))

const nikonJpeg = fixture('nikon.jpg')

describe('index.js', () => {
  describe('#parse', () => {
    it('should work on Nikon jpeg files', () => {
      const results = parse(nikonJpeg)
      expect(results).to.have.property('_raw')
      delete results._raw
      expect(results).to.eql({
        make: 'NIKON CORPORATION',
        model: 'NIKON D610',
        width: 1498,
        height: 1000,
        xResolution: 72,
        yResolution: 72,
        createdAt: new Date('2017-03-16T02:25:25.000Z'),
        modifiedAt: new Date('2017-03-20T22:24:19.000Z'),
        iso: 2500,
        exposureTime: 0.1,
        fNumber: 5.6,
        focalLength: 100,
        normalizedFocalLength: 100,
        exposureCompensation: -0.5,
        lens: {
          make: 'TAMRON',
          model: 'TAMRON 28-300mm F3.5-6.3 Di VC PZD A010N',
          focalLength: '28-300mm',
          aperture: 'F3.5-6.3',
        },
      })
    })
  })
})
