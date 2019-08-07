import * as scenesModule from '../../lib/analyses/scenes'
import {expect, fixtureDecode} from '../utils'

describe.skip('analyses/scenes', () => {
  describe('detectScenes()', () => {
    it('should identify an indoor scene', async () => {
      const imageData = await fixtureDecode('source-scenes-food-court.jpg')
      const faces = await scenesModule.detectScene(imageData)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "confidence": 0.391046941280365,
            "scene": "cafeteria",
          },
          Object {
            "confidence": 0.22175000607967377,
            "scene": "foodCourt",
          },
          Object {
            "confidence": 0.09106193482875824,
            "scene": "restaurantPatio",
          },
          Object {
            "confidence": 0.08022197335958481,
            "scene": "banquetHall",
          },
          Object {
            "confidence": 0.04950771853327751,
            "scene": "diningHall",
          },
        ]
      `)
    })

    it('should identify an outdoor scene', async () => {
      const imageData = await fixtureDecode('source-yosemite.jpg')
      const faces = await scenesModule.detectScene(imageData)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "confidence": 0.7298914790153503,
            "scene": "mountainSnowy",
          },
          Object {
            "confidence": 0.08638417720794678,
            "scene": "iceShelf",
          },
          Object {
            "confidence": 0.08363950252532959,
            "scene": "glacier",
          },
        ]
      `)
    })

    it('should identify a harbor scene', async () => {
      const imageData = await fixtureDecode('source-sydney.jpg')
      const faces = await scenesModule.detectScene(imageData)
      expect(faces).toMatchInlineSnapshot(`
        Array [
          Object {
            "confidence": 0.5394873023033142,
            "scene": "harbor",
          },
          Object {
            "confidence": 0.05185322463512421,
            "scene": "coast",
          },
          Object {
            "confidence": 0.04901811480522156,
            "scene": "boatDeck",
          },
          Object {
            "confidence": 0.03499992564320564,
            "scene": "ocean",
          },
          Object {
            "confidence": 0.03217465057969093,
            "scene": "pier",
          },
        ]
      `)
    })
  })
})
