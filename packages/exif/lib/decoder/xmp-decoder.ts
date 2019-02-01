import {IBufferLike, IGenericMetadata, IIFDTagDefinition, IFDTagName} from '../utils/types'
import {tags} from '../utils/tags'

const EXIF_ATTR_GLOBAL_REGEX = /(exif|tiff):([0-9a-z]+?)="(.*?)"/gim
const EXIF_ATTR_REGEX = /f:([0-9a-z]+?)="(.*?)"/i

function isSimpleNumber(s: string): boolean {
  return /^(([1-9]\d*)|0)$/.test(s)
}

function isComplexNumber(s: string): boolean {
  return /^[1-9]\d*\/[1-9]\d*$/.test(s)
}

export class XMPDecoder {
  private static _tagsByLowerCaseKey: Record<string, IIFDTagDefinition>

  private readonly _text: string

  public constructor(buffer: IBufferLike) {
    this._text = buffer.toString()
    this._precomputeIfdTags()
  }

  private _precomputeIfdTags(): void {
    if (XMPDecoder._tagsByLowerCaseKey) return
    const tagsByLowerCaseKey: Record<string, IIFDTagDefinition> = {}

    for (const tagName of Object.keys(tags)) {
      tagsByLowerCaseKey[tagName.toLowerCase()] = tags[tagName as IFDTagName]
    }

    XMPDecoder._tagsByLowerCaseKey = tagsByLowerCaseKey
  }

  private _processRdfDescription(
    attributes: Record<string, string>,
    genericMetadata: IGenericMetadata,
  ): void {
    for (const key of Object.keys(attributes)) {
      if (!key.startsWith('exif:') && !key.startsWith('tiff:')) continue
      const exifLowercaseTagName = key.slice(5)
      const ifdDefinition = XMPDecoder._tagsByLowerCaseKey[exifLowercaseTagName]
      if (!ifdDefinition) continue

      const value = attributes[key]
      let realValue: number | string | undefined
      if (isSimpleNumber(value)) {
        realValue = Number(value)
      } else if (isComplexNumber(value)) {
        const [numerator, denominator] = value.split('/')
        realValue = Number(numerator) / Number(denominator)
      } else {
        realValue = value
      }

      genericMetadata[ifdDefinition.name] = realValue
    }
  }

  public extractMetadata(): IGenericMetadata {
    const metadata: IGenericMetadata = {}
    const attributes: Record<string, string> = {}
    const matches = this._text.match(EXIF_ATTR_GLOBAL_REGEX)

    for (const match of matches || []) {
      // @ts-ignore - guaranteed to match from above
      const [_, key, value] = match.match(EXIF_ATTR_REGEX)
      attributes[`exif:${key.toLowerCase()}`] = value
    }

    this._processRdfDescription(attributes, metadata)

    return metadata
  }

  public static isXMP(buffer: IBufferLike): boolean {
    const xmpHeader = '<x:xmpmet'
    const xmpAltHeader = '<?xpacket'
    for (let i = 0; i < xmpHeader.length; i++) {
      if (buffer[i] !== xmpHeader.charCodeAt(i) && buffer[i] !== xmpAltHeader.charCodeAt(i))
        return false
    }

    return true
  }
}
