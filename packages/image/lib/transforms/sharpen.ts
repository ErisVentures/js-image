import {ISharpenOptions} from '../types'
import {IAnnotatedImageData} from '../image-data'
import {convolve} from '../transforms/convolve'
import {Matrix} from '../matrix'

function createSharpenMatrix(options: ISharpenOptions): Matrix {
  const {strength = 1} = options
  const edgeValue = -1 * strength
  const centerValue = -4 * edgeValue + 1

  return [[0, edgeValue, 0], [edgeValue, centerValue, edgeValue], [0, edgeValue, 0]]
}

export function sharpen(
  imageData: IAnnotatedImageData,
  options: ISharpenOptions,
): IAnnotatedImageData {
  return convolve(imageData, createSharpenMatrix(options))
}
