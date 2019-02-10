import {ICompositionAnalysis, ICompositionOptions, ISharpness} from '../types'
import {ImageData} from '../image-data'
import {SobelImageData} from '../transforms/sobel'
import {sharpness} from './sharpness'

function computeRuleOfThirds(
  imageData: SobelImageData,
  sharpnessAnalysis: ISharpness,
  options?: ICompositionOptions,
): number {
  const defaultEdgeThreshold = Math.min(Math.max(sharpnessAnalysis.average, 32), 128)
  const {ruleOfThirdsEdgeThreshold = defaultEdgeThreshold, ruleOfThirdsFalloffPoint = 0.4} =
    options || {}
  let ruleOfThirdsScore = 0

  const topThirdsLine = imageData.height / 3
  const bottomThirdsLine = (2 * imageData.height) / 3
  const leftThirdsLine = imageData.width / 3
  const rightThirdsLine = (2 * imageData.width) / 3

  const maxDistanceToLine = Math.min(topThirdsLine, leftThirdsLine)
  const maxDistanceToIntersection = Math.sqrt(topThirdsLine ** 2 + leftThirdsLine ** 2)

  let totalEdgePixels = 0
  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const edgeIntensity = ImageData.valueFor(imageData, x, y)
      if (edgeIntensity <= ruleOfThirdsEdgeThreshold) continue

      // The rule of thirds score...
      //   - greatly increases for edges that are close to intersection of rule of thirds lines
      //   - increases for edges that are close to the rule of thirds lines
      //   - decreases for edges that are far from the rule of thirds lines
      let distanceToXLine: number = Infinity
      let distanceToYLine: number = Infinity

      if (x < imageData.width / 2) {
        if (y < imageData.height / 2) {
          // TOP LEFT QUADRANT
          distanceToXLine = Math.abs(leftThirdsLine - x)
          distanceToYLine = Math.abs(topThirdsLine - y)
        } else {
          // BOTTOM LEFT QUADRANT
          distanceToXLine = Math.abs(leftThirdsLine - x)
          distanceToYLine = Math.abs(bottomThirdsLine - y)
        }
      } else {
        if (y < imageData.height / 2) {
          // TOP RIGHT QUADRANT
          distanceToXLine = Math.abs(rightThirdsLine - x)
          distanceToYLine = Math.abs(topThirdsLine - y)
        } else {
          // BOTTOM RIGHT QUADRANT
          distanceToXLine = Math.abs(rightThirdsLine - x)
          distanceToYLine = Math.abs(bottomThirdsLine - y)
        }
      }

      const distanceToIntersection = Math.sqrt(distanceToXLine ** 2 + distanceToYLine ** 2)
      const distanceToClosestLine = Math.min(distanceToXLine, distanceToYLine)

      const intersectionBonus =
        ruleOfThirdsFalloffPoint - distanceToIntersection / maxDistanceToIntersection
      const lineScore = ruleOfThirdsFalloffPoint - distanceToClosestLine / maxDistanceToLine

      ruleOfThirdsScore += Math.max(intersectionBonus, 0) + lineScore
      totalEdgePixels += 1
    }
  }

  return ruleOfThirdsScore / totalEdgePixels
}

export function composition(
  imageData: SobelImageData,
  options?: ICompositionOptions,
): ICompositionAnalysis {
  const sharpnessAnalysis = (options && options.sharpnessAnalysis) || sharpness(imageData)

  return {
    ruleOfThirds: computeRuleOfThirds(imageData, sharpnessAnalysis, options),
  }
}
