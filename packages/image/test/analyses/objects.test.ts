import * as objectsModule from '../../lib/analyses/objects'
import {expect, fixtureDecode} from '../utils'

describe('analyses/objects', () => {
  describe('detectObjects()', () => {
    it('should identify people', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const objects = await objectsModule.detectObjects(imageData)
      expect(objects).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.7960031628608704,
              "width": 0.4746504873037338,
              "x": 0.12022151052951813,
              "y": 0.20784324407577515,
            },
            "confidence": 0.9469999670982361,
            "object": "person",
          },
          Object {
            "boundingBox": Object {
              "height": 0.7572495937347412,
              "width": 0.38751134276390076,
              "x": 0.4440280497074127,
              "y": 0.24070632457733154,
            },
            "confidence": 0.9391331076622009,
            "object": "person",
          },
        ]
      `)
    })

    it('should work with alternate sizes', async () => {
      const imageData = await fixtureDecode('source-faces-couple.jpg')
      const objects = await objectsModule.detectObjects(imageData, {size: 200})
      expect(objects).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.7900130748748779,
              "width": 0.47114843130111694,
              "x": 0.12344557046890259,
              "y": 0.20625454187393188,
            },
            "confidence": 0.8520854711532593,
            "object": "person",
          },
          Object {
            "boundingBox": Object {
              "height": 0.7380645275115967,
              "width": 0.3944873809814453,
              "x": 0.45160138607025146,
              "y": 0.2574465274810791,
            },
            "confidence": 0.7829182147979736,
            "object": "person",
          },
        ]
      `)
    })

    it('should identify an object', async () => {
      const imageData = await fixtureDecode('source-objects-toothbrush.jpg')
      const objects = await objectsModule.detectObjects(imageData)
      expect(objects).toMatchInlineSnapshot(`
        Array [
          Object {
            "boundingBox": Object {
              "height": 0.8528859317302704,
              "width": 0.31503836810588837,
              "x": 0.20034916698932648,
              "y": 0.13387230038642883,
            },
            "confidence": 0.851569652557373,
            "object": "toothbrush",
          },
        ]
      `)
    })
  })
})
