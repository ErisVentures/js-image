import * as toneModule from '../../lib/transforms/tone'
import {Colorspace} from '../../lib/types'

describe('#transforms/tone', () => {
  describe('#curves', () => {
    const imageData = {width: 1, height: 1, channels: 3, colorspace: Colorspace.YCbCr}
    const curves = curvePoints => imageData => toneModule.curves(imageData, curvePoints).data

    it('should hold in identity case', () => {
      const curve = curves([])
      expect(curve({...imageData, data: [100, 1, 2]})).toEqual([100, 1, 2])
      expect(curve({...imageData, data: [150, 1, 2]})).toEqual([150, 1, 2])
    })

    it('should apply basic linear interpolation', () => {
      const curve = curves([[0, 50], [255, 200]])

      expect(curve({...imageData, data: [0, 1, 2]})).toEqual([50, 1, 2])
      expect(curve({...imageData, data: [255, 1, 2]})).toEqual([200, 1, 2])

      const interpolate = curve({...imageData, data: [128, 1, 2]}).map(Math.round)
      expect(interpolate).toEqual([125, 1, 2])
    })

    it('should apply basic cubic interpolation', () => {
      const curve = curves([[0, 0], [50, 40], [205, 215], [255, 255]])
      const compute = y => Math.round(curve({...imageData, data: [y]})[0])

      expect(compute(0)).toBe(0)
      expect(compute(40)).toBe(31)
      expect(compute(50)).toBe(40)
      expect(compute(90)).toBe(82)
      expect(compute(128)).toBe(128)
      expect(compute(195)).toBe(205)
      expect(compute(205)).toBe(215)
      expect(compute(215)).toBe(224)
      expect(compute(255)).toBe(255)
    })
  })

  describe('#hslAdjustments', () => {
    let imageData
    const baseImageData = {width: 1, height: 1, channels: 3, colorspace: Colorspace.HSL}
    const hsl = (imageData, adjustments) => toneModule.hslAdjustments(imageData, adjustments)

    beforeEach(() => {
      imageData = {...baseImageData, data: [0, 1, 0.5]}
    })

    it('should adjust the hue', () => {
      const adjusted = hsl(imageData, [{targetHue: 0, hueShift: -30}])
      expect(adjusted.data).toEqual([330, 1, 0.5])
    })

    it('should adjust the saturation', () => {
      const adjusted = hsl(imageData, [{targetHue: 0, saturationShift: -0.5}])
      expect(adjusted.data).toEqual([0, 0.5, 0.5])
    })

    it('should adjust the lightness', () => {
      const adjusted = hsl(imageData, [{targetHue: 0, lightnessShift: 0.25}])
      expect(adjusted.data).toEqual([0, 1, 0.75])
    })

    it('should adjust multiple at once', () => {
      imageData.data = [350, 1, 0.5]
      const adjusted = hsl(imageData, [
        {targetHue: 350, hueShift: 15, saturationShift: -0.5, lightnessShift: 0.25},
      ])
      expect(adjusted.data).toEqual([5, 0.5, 0.75])
    })

    it('should not adjustment when hue is different', () => {
      const adjusted = hsl(imageData, [{targetHue: 150, lightnessShift: 0.25}])
      expect(adjusted.data).toEqual([0, 1, 0.5])
    })

    it('should taper adjustment when hue is different', () => {
      const adjusted = hsl(imageData, [{targetHue: 345, lightnessShift: 0.25}])
      expect(adjusted.data).toEqual([0, 1, 0.6767766922712326])
    })

    it('should taper adjustment when multiple dimensions are different', () => {
      imageData.data = [350, 0.5, 0.75]
      const adjusted = hsl(imageData, [{targetHue: 0, lightnessShift: 0.25}])
      expect(adjusted.data).toEqual([350, 0.5, 0.8097865801102643])
    })

    it('should apply multiple adjustments at once', () => {
      imageData.data = [350, 0.5, 0.75]
      const adjusted = hsl(imageData, [{targetHue: 0, lightnessShift: 0.25}])
      expect(adjusted.data).toEqual([350, 0.5, 0.8097865801102643])
    })

    it('should use targetBreadth', () => {
      imageData.data = [120, 1, 0.5]

      let adjusted = hsl(imageData, [{targetHue: 80, targetBreadth: 30, hueShift: 100}])
      expect(adjusted.data[0]).not.toBeGreaterThan(120)
      adjusted = hsl(imageData, [{targetHue: 80, targetBreadth: 60, hueShift: 100}])
      expect(adjusted.data[0]).toBeGreaterThan(120)
      adjusted = hsl(imageData, [{targetHue: 40, targetBreadth: 100, hueShift: 100}])
      expect(adjusted.data[0]).toBeGreaterThan(120)
    })
  })
})
