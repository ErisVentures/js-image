import * as facesModule from '../../lib/analyses/faces'
import {expect, fixtureDecode} from '../utils'

describe('analyses/faces', () => {
  describe('detectFaces()', () => {
    it('should find faces in clear shot', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const faces = await facesModule.detectFaces(imageData)
      faces.forEach(face => (face.descriptor = face.descriptor.slice(0, 2)))
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.11666666666666667,
              "width": 0.135,
              "x": 0.4275,
              "y": 0.25,
            },
            "confidence": 0.9888889789581299,
            "descriptor": Array [
              81,
              180,
            ],
            "expression": "happy",
            "expressionConfidence": 1,
            "eyes": Array [
              Object {
                "height": 0.016666666666666666,
                "openConfidence": 0.5158189535140991,
                "width": 0.035,
                "x": 0.4675,
                "y": 0.29,
              },
              Object {
                "height": 0.016666666666666666,
                "openConfidence": 0.6646198034286499,
                "width": 0.035,
                "x": 0.52,
                "y": 0.2966666666666667,
              },
            ],
            "happinessConfidence": 1,
          },
          Object {
            "boundingBox": Object {
              "height": 0.11166666666666666,
              "width": 0.11,
              "x": 0.56,
              "y": 0.27666666666666667,
            },
            "confidence": 0.9870948791503906,
            "descriptor": Array [
              93,
              172,
            ],
            "expression": "happy",
            "expressionConfidence": 0.9999966621398926,
            "eyes": Array [
              Object {
                "height": 0.013333333333333334,
                "openConfidence": 0.7949417233467102,
                "width": 0.0275,
                "x": 0.565,
                "y": 0.31833333333333336,
              },
              Object {
                "height": 0.013333333333333334,
                "openConfidence": 0.9452188611030579,
                "width": 0.0275,
                "x": 0.6175,
                "y": 0.32,
              },
            ],
            "happinessConfidence": 0.9999966621398926,
          },
        ]
      `)
    })

    it('should find faces in cluttered shot', async () => {
      const imageData = await fixtureDecode('source-faces-closed-eyes.jpg')
      const faces = await facesModule.detectFaces(imageData)
      faces.forEach(face => (face.descriptor = face.descriptor.slice(0, 2)))
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.325,
              "width": 0.18166666666666667,
              "x": 0.435,
              "y": 0.3025,
            },
            "confidence": 0.9829438924789429,
            "descriptor": Array [
              116,
              154,
            ],
            "expression": "sad",
            "expressionConfidence": 0.9999539852142334,
            "eyes": Array [
              Object {
                "height": 0.05,
                "openConfidence": 0.007234203163534403,
                "width": 0.045,
                "x": 0.47833333333333333,
                "y": 0.43,
              },
              Object {
                "height": 0.05,
                "openConfidence": 0.01330364216119051,
                "width": 0.045,
                "x": 0.5566666666666666,
                "y": 0.4175,
              },
            ],
            "happinessConfidence": 2.3540910376596003e-7,
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
