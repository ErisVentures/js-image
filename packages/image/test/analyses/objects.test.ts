import * as objectsModule from '../../lib/analyses/objects'
import {expect, fixtureDecode, roundNumbersToHundredths} from '../utils'

describe('analyses/objects', () => {
  describe('detectObjects()', () => {
    it('should identify people', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const objects = await objectsModule.detectObjects(imageData)

      roundNumbersToHundredths(objects)
      expect(objects).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.8,
              "width": 0.47,
              "x": 0.12,
              "y": 0.21,
            },
            "confidence": 0.95,
            "object": "person",
          },
          Object {
            "boundingBox": Object {
              "height": 0.76,
              "width": 0.39,
              "x": 0.44,
              "y": 0.24,
            },
            "confidence": 0.94,
            "object": "person",
          },
        ]
      `)
    })

    it('should work with alternate sizes', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const objects = await objectsModule.detectObjects(imageData, {size: 200})

      roundNumbersToHundredths(objects)
      expect(objects).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.79,
              "width": 0.47,
              "x": 0.12,
              "y": 0.21,
            },
            "confidence": 0.85,
            "object": "person",
          },
          Object {
            "boundingBox": Object {
              "height": 0.74,
              "width": 0.39,
              "x": 0.45,
              "y": 0.26,
            },
            "confidence": 0.78,
            "object": "person",
          },
        ]
      `)
    })

    it('should identify an object', async () => {
      const imageData = await fixtureDecode('source-objects-toothbrush.jpg')
      const objects = await objectsModule.detectObjects(imageData)
      roundNumbersToHundredths(objects)
      expect(objects).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.85,
              "width": 0.32,
              "x": 0.2,
              "y": 0.13,
            },
            "confidence": 0.85,
            "object": "toothbrush",
          },
        ]
      `)
    })
  })
})
