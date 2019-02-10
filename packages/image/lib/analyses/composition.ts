import {ICompositionAnalysis, ICompositionOptions} from '../types'
import {ImageData} from '../image-data'
import {SobelImageData} from '../transforms/sobel'
import {sharpness, computeAverage} from './sharpness'

function computeRuleOfThirds(
  imageData: SobelImageData,
  options: Required<ICompositionOptions>,
): number {
  const {ruleOfThirdsEdgeThreshold, ruleOfThirdsFalloffPoint} = options
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

function computeParallelism(
  imageData: SobelImageData,
  options: Required<ICompositionOptions>,
  isHorizontal: boolean = false,
): number {
  const {parallelismStreakThreshold, parallelismEdgeThreshold} = options
  const iMax = isHorizontal ? imageData.height : imageData.width
  const jMax = isHorizontal ? imageData.width : imageData.height

  const streaks: number[] = []
  for (let i = 0; i < iMax; i++) {
    let numConsecutiveEdgePixels = 0

    const streaksInRowOrColumn: number[] = []
    for (let j = 0; j < jMax; j++) {
      const x = isHorizontal ? j : i
      const y = isHorizontal ? i : j
      const index = ImageData.indexFor(imageData, x, y)

      // We are looking for gradient angles in the opposite direction
      // i.e. for horizontal parallelism we want horizontal lines and vertical gradients (90°)
      // i.e. for vertical parallelism we want vertical lines and horizontal gradients (0°)
      const isCorrectEdgeAngle = isHorizontal
        ? imageData.angles[index] === 90
        : imageData.angles[index] === 0

      const isStrongEnoughEdge = imageData.data[index] > parallelismEdgeThreshold
      if (isCorrectEdgeAngle && isStrongEnoughEdge) {
        // Our edge streak is continuing, increment our edge counter
        numConsecutiveEdgePixels++
      } else if (numConsecutiveEdgePixels) {
        // Our edge streak is ending
        // Add the streak to our set of streaks if it was long enough
        if (numConsecutiveEdgePixels / jMax > parallelismStreakThreshold)
          streaksInRowOrColumn.push(numConsecutiveEdgePixels)
        // Reset our edge counter
        numConsecutiveEdgePixels = 0
      }
    }

    if (numConsecutiveEdgePixels) streaksInRowOrColumn.push(numConsecutiveEdgePixels)

    const streak = computeAverage(streaksInRowOrColumn) / jMax
    if (streak > parallelismStreakThreshold) streaks.push(streak)
  }

  return computeAverage(streaks)
}

export function composition(
  imageData: SobelImageData,
  options?: ICompositionOptions,
): ICompositionAnalysis {
  const sharpnessAnalysis = (options && options.sharpnessAnalysis) || sharpness(imageData)

  const defaultEdgeThreshold = Math.min(Math.max(sharpnessAnalysis.average, 32), 128)
  const optionsWithDefaults = {
    ruleOfThirdsEdgeThreshold: defaultEdgeThreshold,
    ruleOfThirdsFalloffPoint: 0.4,
    parallelismEdgeThreshold: defaultEdgeThreshold,
    parallelismStreakThreshold: 0.05,
    sharpnessAnalysis,
    ...options,
  }

  return {
    ruleOfThirds: computeRuleOfThirds(imageData, optionsWithDefaults),
    horizontalParallelism: computeParallelism(imageData, optionsWithDefaults, true),
    verticalParallelism: computeParallelism(imageData, optionsWithDefaults),
  }
}
