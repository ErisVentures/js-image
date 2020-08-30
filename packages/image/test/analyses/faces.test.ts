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
            "jaw": Object {
              "points": Array [
                Object {
                  "x": 0.43,
                  "y": 0.29,
                },
                Object {
                  "x": 0.43,
                  "y": 0.3,
                },
                Object {
                  "x": 0.43,
                  "y": 0.31,
                },
                Object {
                  "x": 0.43,
                  "y": 0.32,
                },
                Object {
                  "x": 0.43,
                  "y": 0.34,
                },
                Object {
                  "x": 0.44,
                  "y": 0.35,
                },
                Object {
                  "x": 0.45,
                  "y": 0.35,
                },
                Object {
                  "x": 0.47,
                  "y": 0.36,
                },
                Object {
                  "x": 0.49,
                  "y": 0.36,
                },
                Object {
                  "x": 0.51,
                  "y": 0.36,
                },
                Object {
                  "x": 0.52,
                  "y": 0.36,
                },
                Object {
                  "x": 0.53,
                  "y": 0.36,
                },
                Object {
                  "x": 0.54,
                  "y": 0.35,
                },
                Object {
                  "x": 0.55,
                  "y": 0.34,
                },
                Object {
                  "x": 0.55,
                  "y": 0.33,
                },
                Object {
                  "x": 0.56,
                  "y": 0.32,
                },
                Object {
                  "x": 0.56,
                  "y": 0.31,
                },
              ],
            },
            "mouth": Object {
              "height": 0.02,
              "width": 0.06,
              "x": 0.47,
              "y": 0.33,
            },
            "nose": Object {
              "points": Array [
                Object {
                  "x": 0.51,
                  "y": 0.3,
                },
                Object {
                  "x": 0.51,
                  "y": 0.31,
                },
                Object {
                  "x": 0.51,
                  "y": 0.32,
                },
                Object {
                  "x": 0.51,
                  "y": 0.33,
                },
                Object {
                  "x": 0.5,
                  "y": 0.33,
                },
                Object {
                  "x": 0.5,
                  "y": 0.33,
                },
                Object {
                  "x": 0.51,
                  "y": 0.33,
                },
                Object {
                  "x": 0.51,
                  "y": 0.33,
                },
                Object {
                  "x": 0.52,
                  "y": 0.33,
                },
              ],
            },
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
            "jaw": Object {
              "points": Array [
                Object {
                  "x": 0.55,
                  "y": 0.33,
                },
                Object {
                  "x": 0.55,
                  "y": 0.34,
                },
                Object {
                  "x": 0.55,
                  "y": 0.35,
                },
                Object {
                  "x": 0.56,
                  "y": 0.35,
                },
                Object {
                  "x": 0.56,
                  "y": 0.36,
                },
                Object {
                  "x": 0.57,
                  "y": 0.37,
                },
                Object {
                  "x": 0.58,
                  "y": 0.38,
                },
                Object {
                  "x": 0.59,
                  "y": 0.38,
                },
                Object {
                  "x": 0.6,
                  "y": 0.39,
                },
                Object {
                  "x": 0.62,
                  "y": 0.38,
                },
                Object {
                  "x": 0.64,
                  "y": 0.38,
                },
                Object {
                  "x": 0.65,
                  "y": 0.37,
                },
                Object {
                  "x": 0.66,
                  "y": 0.37,
                },
                Object {
                  "x": 0.66,
                  "y": 0.36,
                },
                Object {
                  "x": 0.67,
                  "y": 0.35,
                },
                Object {
                  "x": 0.67,
                  "y": 0.34,
                },
                Object {
                  "x": 0.67,
                  "y": 0.33,
                },
              ],
            },
            "mouth": Object {
              "height": 0.02,
              "width": 0.05,
              "x": 0.58,
              "y": 0.36,
            },
            "nose": Object {
              "points": Array [
                Object {
                  "x": 0.6,
                  "y": 0.33,
                },
                Object {
                  "x": 0.6,
                  "y": 0.34,
                },
                Object {
                  "x": 0.6,
                  "y": 0.34,
                },
                Object {
                  "x": 0.6,
                  "y": 0.35,
                },
                Object {
                  "x": 0.59,
                  "y": 0.35,
                },
                Object {
                  "x": 0.6,
                  "y": 0.35,
                },
                Object {
                  "x": 0.6,
                  "y": 0.35,
                },
                Object {
                  "x": 0.61,
                  "y": 0.35,
                },
                Object {
                  "x": 0.61,
                  "y": 0.35,
                },
              ],
            },
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
            "jaw": Object {
              "points": Array [
                Object {
                  "x": 0.38,
                  "y": 0.3,
                },
                Object {
                  "x": 0.38,
                  "y": 0.31,
                },
                Object {
                  "x": 0.39,
                  "y": 0.32,
                },
                Object {
                  "x": 0.4,
                  "y": 0.34,
                },
                Object {
                  "x": 0.41,
                  "y": 0.35,
                },
                Object {
                  "x": 0.43,
                  "y": 0.37,
                },
                Object {
                  "x": 0.46,
                  "y": 0.38,
                },
                Object {
                  "x": 0.48,
                  "y": 0.39,
                },
                Object {
                  "x": 0.51,
                  "y": 0.39,
                },
                Object {
                  "x": 0.53,
                  "y": 0.37,
                },
                Object {
                  "x": 0.55,
                  "y": 0.37,
                },
                Object {
                  "x": 0.55,
                  "y": 0.35,
                },
                Object {
                  "x": 0.55,
                  "y": 0.34,
                },
                Object {
                  "x": 0.56,
                  "y": 0.33,
                },
                Object {
                  "x": 0.58,
                  "y": 0.33,
                },
                Object {
                  "x": 0.59,
                  "y": 0.31,
                },
                Object {
                  "x": 0.59,
                  "y": 0.3,
                },
              ],
            },
            "mouth": Object {
              "height": 0.02,
              "width": 0.06,
              "x": 0.48,
              "y": 0.35,
            },
            "nose": Object {
              "points": Array [
                Object {
                  "x": 0.52,
                  "y": 0.32,
                },
                Object {
                  "x": 0.52,
                  "y": 0.33,
                },
                Object {
                  "x": 0.52,
                  "y": 0.34,
                },
                Object {
                  "x": 0.52,
                  "y": 0.34,
                },
                Object {
                  "x": 0.5,
                  "y": 0.34,
                },
                Object {
                  "x": 0.51,
                  "y": 0.35,
                },
                Object {
                  "x": 0.52,
                  "y": 0.35,
                },
                Object {
                  "x": 0.53,
                  "y": 0.35,
                },
                Object {
                  "x": 0.53,
                  "y": 0.34,
                },
              ],
            },
          },
        ]
      `)
    })

    it('should find faces in cluttered shot', async () => {
      const imageData = await fixtureDecode('source-faces-closed-eyes.jpg')
      const faces = await facesModule.detectFaces(imageData)
      faces.forEach(face => (face.descriptor = face.descriptor.slice(0, 2)))
      roundNumbersToHundredths(faces)
      // Only the first face is real, the others are false positives :(
      expect(faces[0]).toMatchInlineSnapshot(`
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
          "jaw": Object {
            "points": Array [
              Object {
                "x": 0.44,
                "y": 0.43,
              },
              Object {
                "x": 0.45,
                "y": 0.47,
              },
              Object {
                "x": 0.46,
                "y": 0.5,
              },
              Object {
                "x": 0.46,
                "y": 0.53,
              },
              Object {
                "x": 0.47,
                "y": 0.56,
              },
              Object {
                "x": 0.49,
                "y": 0.59,
              },
              Object {
                "x": 0.51,
                "y": 0.6,
              },
              Object {
                "x": 0.53,
                "y": 0.62,
              },
              Object {
                "x": 0.55,
                "y": 0.63,
              },
              Object {
                "x": 0.58,
                "y": 0.62,
              },
              Object {
                "x": 0.59,
                "y": 0.59,
              },
              Object {
                "x": 0.6,
                "y": 0.57,
              },
              Object {
                "x": 0.61,
                "y": 0.54,
              },
              Object {
                "x": 0.62,
                "y": 0.52,
              },
              Object {
                "x": 0.62,
                "y": 0.49,
              },
              Object {
                "x": 0.62,
                "y": 0.45,
              },
              Object {
                "x": 0.62,
                "y": 0.42,
              },
            ],
          },
          "mouth": Object {
            "height": 0.04,
            "width": 0.06,
            "x": 0.52,
            "y": 0.56,
          },
          "nose": Object {
            "points": Array [
              Object {
                "x": 0.54,
                "y": 0.46,
              },
              Object {
                "x": 0.54,
                "y": 0.48,
              },
              Object {
                "x": 0.54,
                "y": 0.5,
              },
              Object {
                "x": 0.54,
                "y": 0.53,
              },
              Object {
                "x": 0.53,
                "y": 0.54,
              },
              Object {
                "x": 0.54,
                "y": 0.54,
              },
              Object {
                "x": 0.55,
                "y": 0.54,
              },
              Object {
                "x": 0.55,
                "y": 0.54,
              },
              Object {
                "x": 0.56,
                "y": 0.53,
              },
            ],
          },
        }
      `)
    })

    it('should find faces in large group shot', async () => {
      const imageData = await fixtureDecode('source-faces-large-group.jpg')
      const faces = await facesModule.detectFaces(imageData)
      expect(faces).toHaveLength(58)
      const openEyes = faces.map(face => face.eyes.filter(e => e.openConfidence > 0.5))
      const openEyesFlat = [].concat(...openEyes)
      expect(openEyesFlat).toHaveLength(18)
    })

    it('should not find faces in landscapes', async () => {
      const imageData = await fixtureDecode('source-sydney.jpg')
      const faces = await facesModule.detectFaces(imageData)
      expect(faces).toHaveLength(0)
    })
  })
})
