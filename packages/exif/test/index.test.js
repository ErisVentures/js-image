const {expect, fixture} = require('./utils')
const TIFFDecoder = require('../dist/decoder/tiff-decoder').TIFFDecoder
const parse = require('../dist').parse

const nikonJpeg = fixture('nikon.jpg')
const nikonNef = fixture('nikon.nef')
const iphoneDng = fixture('iphone.dng')

describe('index.js', () => {
  describe('#parse', () => {
    it('should accept a TIFFDecoder as input', () => {
      const decoder = new TIFFDecoder(nikonNef)
      const results = parse(decoder)
      expect(results).to.have.property('make', 'NIKON CORPORATION')
    })

    it('should be idempotent', () => {
      const decoder = new TIFFDecoder(nikonNef)
      decoder.extractMetadata()

      const results = parse(decoder)
      expect(results).to.have.property('make', 'NIKON CORPORATION')
      expect(results).to.have.property('fNumber', 5.6)
    })

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

    it('should mostly work on Nikon nef files', () => {
      const results = parse(nikonNef)
      expect(results).to.have.property('_raw')
      delete results._raw
      expect(results).to.eql({
        make: 'NIKON CORPORATION',
        model: 'NIKON D4S',
        width: 3244,
        height: 2144,
        xResolution: 300,
        yResolution: 300,
        createdAt: new Date('2014-03-26T14:23:37.000Z'),
        modifiedAt: new Date('2014-03-26T14:23:37.000Z'),
        iso: 100,
        exposureTime: 1 / 6,
        fNumber: 5.6,
        focalLength: 100,
        normalizedFocalLength: 150,
        exposureCompensation: 0,
        lens: undefined,
      })
    })

    it('should work on iphone dng files', () => {
      const results = parse(iphoneDng)
      expect(results).to.have.property('_raw')
      delete results._raw
      expect(results).to.eql({
        make: 'Apple',
        model: 'iPhone 7 Plus',
        width: 4032,
        height: 3024,
        xResolution: undefined,
        yResolution: undefined,
        createdAt: new Date('2017-10-07T16:25:39.000Z'),
        modifiedAt: new Date('2017-10-07T16:25:39.000Z'),
        iso: 20,
        exposureTime: 1 / 127,
        fNumber: 1.8,
        focalLength: 3.99,
        normalizedFocalLength: 28,
        exposureCompensation: -1,
        lens: {
          model: 'iPhone 7 Plus back camera 3.99mm f/1.8',
          make: 'iPhone',
          focalLength: '99mm',
          aperture: undefined,
        },
      })
    })
  })
})
