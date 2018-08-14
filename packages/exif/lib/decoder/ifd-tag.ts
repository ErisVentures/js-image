import {tags} from '../utils/tags'
import {IFDTagName} from '../utils/types'

export function getFriendlyName(code: number): IFDTagName {
  const tag = tags.find(tag => tag.identifier === code)
  return (tag && tag.name) || 'Unknown'
}
