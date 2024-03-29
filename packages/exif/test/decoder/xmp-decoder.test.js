const {fixture} = require('../utils')
const XMPDecoder = require('../../dist/decoder/xmp-decoder').XMPDecoder

const xmpFile = fixture('d4s.xmp')

describe('lib/decoder/xmp-decoder.js', () => {
  describe('.extractMetadata', () => {
    it('should work on Lightroom formatted XMP', () => {
      const metadata = new XMPDecoder(xmpFile).extractMetadata()
      expect(metadata).toEqual({
        ApertureValue: 2.970854,
        Contrast: 0,
        CreateDate: '2014-04-01T09:23:43.29',
        CustomRendered: 0,
        DateTimeOriginal: '2014-04-01T09:23:43.29',
        DigitalZoomRatio: 1,
        ExposureMode: 0,
        ExposureProgram: 3,
        ExposureTime: 0.0125,
        FNumber: 2.8,
        FileSource: 3,
        FocalLength: 70,
        FocalPlaneResolutionUnit: 3,
        FocalPlaneXResolution: 1368.8888854980469,
        FocalPlaneYResolution: 1368.8888854980469,
        GainControl: 0,
        ImageLength: 3280,
        ImageWidth: 4928,
        LightSource: 0,
        Make: 'NIKON CORPORATION',
        MaxApertureValue: 3,
        MetadataDate: '2019-01-27T21:42:30-06:00',
        MeteringMode: 5,
        Model: 'NIKON D4S',
        ModifyDate: '2014-04-01T09:23:43.29',
        Orientation: 1,
        Rating: 3,
        Saturation: 0,
        SceneCaptureType: 0,
        SceneType: 1,
        SensingMethod: 2,
        SensitivityType: 2,
        Sharpness: 0,
        ShutterSpeedValue: 6.321928,
        SubjectDistanceRange: 0,
        WhiteBalance: 0,
        DCSubjectBagOfWords: '["portfolio","showcase","yosemite valley"]',
      })
    })

    it('should work on XnView formatted XMP', () => {
      const buffer = fixture('xnview.xmp')
      expect(XMPDecoder.isXMP(buffer)).toEqual(true)
      const metadata = new XMPDecoder(buffer).extractMetadata()
      expect(metadata).toEqual({
        CreateDate: '2014-12-27T11:37:21.70',
        MetadataDate: '2019-04-10T20:43:14-05:00',
        ModifyDate: '2019-04-10T20:43:14-05:00',
        Rating: 5,
      })
    })

    it('should work on Exempi formatted XMP', () => {
      const buffer = fixture('exempi.xmp')
      expect(XMPDecoder.isXMP(buffer)).toEqual(true)
      const metadata = new XMPDecoder(buffer).extractMetadata()
      expect(metadata).toEqual({
        Label: 'Red',
        Rating: 2,
      })
    })
  })
})
