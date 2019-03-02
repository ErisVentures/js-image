import {IGenericMetadata} from '../utils/types'

export function parseKeywords(data: IGenericMetadata): string[] | undefined {
  if (typeof data.DCSubjectBagOfWords !== 'string') return undefined

  try {
    return JSON.parse(data.DCSubjectBagOfWords)
  } catch (_) {
    return undefined
  }
}
