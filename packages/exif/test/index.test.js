const {fixture} = require('./utils')
const TIFFDecoder = require('../dist/decoder/tiff-decoder').TIFFDecoder
const parse = require('../dist').parse

const xmpFile = fixture('d4s.xmp')
const xmpJpeg = fixture('xmp.jpg')
const copyrightJpeg = fixture('copyright.jpg')
const nikonJpeg = fixture('nikon.jpg')
const nikonNef = fixture('nikon.nef')
const canonCr2 = fixture('1000d.cr2')
const sonyArw = fixture('a7rii.arw')
const iphoneDng = fixture('iphone.dng')

describe('index.js', () => {
  describe('#parse', () => {
    it('should accept a TIFFDecoder as input', () => {
      const decoder = new TIFFDecoder(nikonNef)
      const results = parse(decoder)
      expect(results).toHaveProperty('make', 'NIKON CORPORATION')
    })

    it('should be idempotent', () => {
      const decoder = new TIFFDecoder(nikonNef)
      decoder.extractMetadata()

      const results = parse(decoder)
      expect(results).toHaveProperty('make', 'NIKON CORPORATION')
      expect(results).toHaveProperty('fNumber', 5.6)
    })

    it('should work on Nikon jpeg files', () => {
      const results = parse(nikonJpeg)
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        make: 'NIKON CORPORATION',
        model: 'NIKON D610',
        width: 1498,
        height: 1000,
        xResolution: 72,
        yResolution: 72,
        createdAt: new Date('2017-03-16T02:25:25.000Z'),
        modifiedAt: new Date('2017-03-20T22:24:19-07:00'),
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
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
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

    it('should work on canon raw files', () => {
      const results = parse(canonCr2)
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        make: 'Canon',
        model: 'Canon EOS DIGITAL REBEL XS',
        width: 2592,
        height: 3888,
        xResolution: 72,
        yResolution: 72,
        createdAt: new Date('2010-07-23T11:00:15.000Z'),
        modifiedAt: new Date('2010-07-23T11:00:15.000Z'),
        iso: 100,
        exposureTime: 1 / 800,
        fNumber: 5.6,
        focalLength: 55,
        normalizedFocalLength: 55,
        exposureCompensation: 1 / 3,
      })
    })

    it('should work on canon cr3 files', () => {
      const results = parse(fixture('m50.cr3'))
      expect(results).toHaveProperty('_raw')
      expect(results).toMatchObject({
        make: 'Canon',
        model: 'Canon EOS M50',
      })
    })

    it('should work on sony raw files', () => {
      const results = parse(sonyArw)
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        make: 'SONY',
        model: 'ILCE-7RM2',
        width: 7952,
        height: 5304,
        xResolution: 72,
        yResolution: 72,
        createdAt: new Date('2015-09-07T17:43:08.000Z'),
        modifiedAt: new Date('2015-09-07T17:43:08.000Z'),
        iso: 1600,
        exposureTime: 1 / 60,
        fNumber: 8,
        focalLength: 55,
        normalizedFocalLength: 55,
        exposureCompensation: 0,
        lens: {
          aperture: 'F1.8',
          focalLength: '55mm',
          make: 'FE',
          model: 'FE 55mm F1.8 ZA',
        },
      })
    })

    it('should work on sony raw files converted to dng', () => {
      const results = parse(fixture('sony.dng'))
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        make: 'SONY',
        model: 'DSLR-A900',
        width: 6048,
        height: 4032,
        createdAt: new Date('2008-12-22T16:37:58.000Z'),
        modifiedAt: new Date('2020-05-01T15:10:26.000Z'),
        iso: 100,
        exposureTime: 1 / 125,
        fNumber: 8,
        focalLength: 40,
        normalizedFocalLength: 40,
        exposureCompensation: 0,
        lens: {
          aperture: 'F2.8',
          focalLength: '24-70mm',
          make: '24',
          model: '24-70mm F2.8 ZA SSM',
        },
      })
    })

    it('should work on iphone dng files', () => {
      const results = parse(iphoneDng)
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        make: 'Apple',
        model: 'iPhone 7 Plus',
        width: 3024,
        height: 4032,
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

    it('should work on raw XMP files', () => {
      const results = parse(xmpFile)
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        make: 'NIKON CORPORATION',
        model: 'NIKON D4S',
        width: 4928,
        height: 3280,
        xResolution: undefined,
        yResolution: undefined,
        createdAt: new Date('2014-04-01T09:23:43.290Z'),
        modifiedAt: new Date('2014-04-01T09:23:43.290Z'),
        iso: undefined,
        exposureTime: 1 / 80,
        fNumber: 2.8,
        focalLength: 70,
        normalizedFocalLength: 70,
        exposureCompensation: undefined,
        lens: undefined,
      })
    })

    it('should work on jpegs with XMP', () => {
      const results = parse(xmpJpeg)
      expect(results).toHaveProperty('_raw')
      delete results._raw
      expect(results).toMatchObject({
        rating: 4,
        colorLabel: 'Blue',
      })
    })

    it('should work on jpegs with copyright profiles', () => {
      const results = parse(copyrightJpeg)
      expect(results).toHaveProperty('_raw')
      expect(results).toMatchObject({
        rating: 5,
        colorLabel: 'Purple',
        keywords: ['portfolio', 'showcase', 'yosemite valley'],
      })
    })
  })
})
