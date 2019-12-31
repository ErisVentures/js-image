import * as facesModule from '../../lib/analyses/faces'
import {expect, fixtureDecode, roundNumbersToHundredths} from '../utils'

describe('analyses/faces', () => {
  describe('detectFaces()', () => {
    it('should find faces in clear shot', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const faces = await facesModule.detectFaces(imageData)
      faces.forEach(face => (face.descriptor = face.descriptor.slice(0, 2)))
      roundNumbersToHundredths(faces)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.12,
              "width": 0.14,
              "x": 0.43,
              "y": 0.25,
            },
            "confidence": 0.99,
            "descriptor": Array [
              81,
              180,
            ],
            "expression": "happy",
            "expressionConfidence": 1,
            "eyes": Array [
              Object {
                "height": 0.02,
                "openConfidence": 0.52,
                "width": 0.04,
                "x": 0.47,
                "y": 0.29,
              },
              Object {
                "height": 0.02,
                "openConfidence": 0.66,
                "width": 0.04,
                "x": 0.52,
                "y": 0.3,
              },
            ],
            "happinessConfidence": 1,
          },
          Object {
            "boundingBox": Object {
              "height": 0.11,
              "width": 0.11,
              "x": 0.56,
              "y": 0.28,
            },
            "confidence": 0.99,
            "descriptor": Array [
              93,
              172,
            ],
            "expression": "happy",
            "expressionConfidence": 1,
            "eyes": Array [
              Object {
                "height": 0.01,
                "openConfidence": 0.79,
                "width": 0.03,
                "x": 0.56,
                "y": 0.32,
              },
              Object {
                "height": 0.01,
                "openConfidence": 0.95,
                "width": 0.03,
                "x": 0.62,
                "y": 0.32,
              },
            ],
            "happinessConfidence": 1,
          },
        ]
      `)
    })

    it('should find faces in different angled shot', async () => {
      const imageData = await fixtureDecode('source-bride.jpg')
      const faces = await facesModule.detectFaces(imageData)
      faces.forEach(face => (face.descriptor = face.descriptor.slice(0, 2)))
      roundNumbersToHundredths(faces)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.19,
              "width": 0.22,
              "x": 0.39,
              "y": 0.22,
            },
            "confidence": 0.93,
            "descriptor": Array [
              113,
              141,
            ],
            "expression": "sad",
            "expressionConfidence": 0.97,
            "eyes": Array [
              Object {
                "height": 0.03,
                "openConfidence": 0,
                "width": 0.06,
                "x": 0.44,
                "y": 0.31,
              },
              Object {
                "height": 0.03,
                "openConfidence": 0.08,
                "width": 0.06,
                "x": 0.52,
                "y": 0.3,
              },
            ],
            "happinessConfidence": 0,
          },
        ]
      `)
    })

    it('should find faces in cluttered shot', async () => {
      const imageData = await fixtureDecode('source-faces-closed-eyes.jpg')
      const faces = await facesModule.detectFaces(imageData)
      faces.forEach(face => (face.descriptor = face.descriptor.slice(0, 2)))
      roundNumbersToHundredths(faces)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.33,
              "width": 0.18,
              "x": 0.44,
              "y": 0.3,
            },
            "confidence": 0.98,
            "descriptor": Array [
              116,
              154,
            ],
            "expression": "sad",
            "expressionConfidence": 1,
            "eyes": Array [
              Object {
                "height": 0.05,
                "openConfidence": 0.01,
                "width": 0.05,
                "x": 0.48,
                "y": 0.43,
              },
              Object {
                "height": 0.05,
                "openConfidence": 0.01,
                "width": 0.05,
                "x": 0.56,
                "y": 0.42,
              },
            ],
            "happinessConfidence": 0,
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
