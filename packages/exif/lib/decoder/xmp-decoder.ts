import {
  IBufferLike,
  IGenericMetadata,
  IIFDTagDefinition,
  IFDTagName,
  XMPTagName,
} from '../utils/types'
import {tags} from '../utils/tags'

const EXIF_ATTR_GLOBAL_REGEX = /(xmp|exif|tiff):([0-9a-z]+?)="(.*?)"/gim
const EXIF_ATTR_REGEX = /:([0-9a-z]+?)="(.*?)"$/i

function isSimpleNumber(s: string): boolean {
  return /^(([1-9]\d*)|0)$/.test(s)
}

function isComplexNumber(s: string): boolean {
  return /^[1-9]\d*\/[1-9]\d*$/.test(s)
}

const XMP_TAGS: Record<XMPTagName, boolean> = {
  Rating: true,
  Label: true,
  MetadataDate: true,
}

export class XMPDecoder {
  private readonly _text: string

  public constructor(buffer: IBufferLike) {
    this._text = buffer.toString()
  }

  private _handleMatch(key: string, value: string, genericMetadata: IGenericMetadata): void {
    // TODO: support mixed case in the XMP
    if (!(key in tags) && !(key in XMP_TAGS)) return
    const knownKey = key as IFDTagName | XMPTagName

    let realValue: number | string | undefined
    if (isSimpleNumber(value)) {
      realValue = Number(value)
    } else if (isComplexNumber(value)) {
      const [numerator, denominator] = value.split('/')
      realValue = Number(numerator) / Number(denominator)
    } else {
      realValue = value
    }

    genericMetadata[knownKey] = realValue
  }

  public extractMetadata(): IGenericMetadata {
    const metadata: IGenericMetadata = {}
    const matches = this._text.match(EXIF_ATTR_GLOBAL_REGEX)

    for (const match of matches || []) {
      // @ts-ignore - guaranteed to match from above
      const [_, key, value] = match.match(EXIF_ATTR_REGEX)
      this._handleMatch(key, value, metadata)
    }

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
