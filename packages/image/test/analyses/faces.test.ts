import * as facesModule from '../../lib/analyses/faces'
import {expect, fixtureDecode} from '../utils'

describe('analyses/faces', () => {
  describe('detectFaces()', () => {
    it('should find faces in clear shot', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const faces = await facesModule.detectFaces(imageData)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 70,
              "width": 54,
              "x": 171,
              "y": 150,
            },
            "confidence": 0.9888889789581299,
            "eyes": Array [
              Object {
                "height": 10,
                "openConfidence": 0.5158189535140991,
                "width": 14,
                "x": 187,
                "y": 174,
              },
              Object {
                "height": 10,
                "openConfidence": 0.6646197438240051,
                "width": 14,
                "x": 208,
                "y": 178,
              },
            ],
            "happinessConfidence": 1,
          },
          Object {
            "boundingBox": Object {
              "height": 67,
              "width": 44,
              "x": 224,
              "y": 166,
            },
            "confidence": 0.9870948791503906,
            "eyes": Array [
              Object {
                "height": 8,
                "openConfidence": 0.7949417233467102,
                "width": 11,
                "x": 226,
                "y": 191,
              },
              Object {
                "height": 8,
                "openConfidence": 0.9452188611030579,
                "width": 11,
                "x": 247,
                "y": 192,
              },
            ],
            "happinessConfidence": 1,
          },
        ]
      `)
    })

    it('should find faces in cluttered shot', async () => {
      const imageData = await fixtureDecode('source-faces-closed-eyes.jpg')
      const faces = await facesModule.detectFaces(imageData)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 130,
              "width": 109,
              "x": 261,
              "y": 121,
            },
            "confidence": 0.9829439520835876,
            "eyes": Array [
              Object {
                "height": 20,
                "openConfidence": 0.007234196178615093,
                "width": 27,
                "x": 287,
                "y": 172,
              },
              Object {
                "height": 20,
                "openConfidence": 0.01330363005399704,
                "width": 27,
                "x": 334,
                "y": 167,
              },
            ],
            "happinessConfidence": 0.000010031476449512411,
          },
        ]
      `)
    })

    it('should find faces in large group shot', async () => {
      const imageData = await fixtureDecode('source-faces-large-group.jpg')
      const faces = await facesModule.detectFaces(imageData)
      expect(faces).toHaveLength(42)
      const openEyes = faces.map(face => face.eyes.filter(e => e.openConfidence > 0.5))
      const openEyesFlat = [].concat(...openEyes)
      expect(openEyesFlat).toHaveLength(14)
    })

    it('should not find faces in landscapes', async () => {
      const imageData = await fixtureDecode('source-sydney.jpg')
      const faces = await facesModule.detectFaces(imageData)
      expect(faces).toHaveLength(0)
    })
  })
})
