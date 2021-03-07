import {IBufferLike, IGenericMetadata, IFDTagName, XMPTagName} from '../utils/types'
import {tags, xmpTags} from '../utils/tags'

const EXIF_ATTR_GLOBAL_REGEX = /(xmp|exif|tiff):([0-9a-z]+?)="(.*?)"/gim
const EXIF_ATTR_REGEX = /:([0-9a-z]+?)="(.*?)"$/i
const XML_TAG_GLOBAL_REGEX = /<((xmp|exif|tiff):([0-9a-z]+?))>((.|\\s)*?)<\/\1>/gim
const XML_TAG_REGEX = new RegExp(XML_TAG_GLOBAL_REGEX.source, 'im')

function isSimpleNumber(s: string): boolean {
  return /^(([1-9]\d*)|0)$/.test(s)
}

function isComplexNumber(s: string): boolean {
  return /^[1-9]\d*\/[1-9]\d*$/.test(s)
}

function getXMLTagRegExp(tag: string, flags?: string): RegExp {
  return new RegExp(`<${tag}>((.|\\s)*?)</${tag}>`, flags)
}

function findXMLTag(text: string, tag: string): {innerXML: string} | null {
  const regex = getXMLTagRegExp(tag, 'i')
  const match = text.match(regex)
  if (!match) return null
  return {innerXML: match[1]}
}

function findXMLTags(text: string, tag: string): Array<{innerXML: string}> {
  const matches = text.match(getXMLTagRegExp(tag, 'ig'))
  if (!matches) return []
  return matches.map(item => findXMLTag(item, tag)!)
}

export class XMPDecoder {
  private readonly _text: string

  public constructor(buffer: IBufferLike) {
    this._text = buffer.toString()
  }

  private _handleMatch(key: string, value: string, genericMetadata: IGenericMetadata): void {
    // TODO: support mixed case in the XMP
    if (!(key in tags) && !(key in xmpTags)) return
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

  private _decodeAttributeMetadata(metadata: IGenericMetadata): void {
    const matches = this._text.match(EXIF_ATTR_GLOBAL_REGEX)
    for (const attribute of matches || []) {
      // tslint:disable-next-line
      const [_, key, value] = attribute.match(EXIF_ATTR_REGEX) || ['', '', '']
      this._handleMatch(key, value, metadata)
    }
  }

  private _decodeElementMetadata(metadata: IGenericMetadata): void {
    const matches = this._text.match(XML_TAG_GLOBAL_REGEX)
    for (const match of matches || []) {
      // tslint:disable-next-line
      const [_, tagName, namespace, key, value] = match.match(XML_TAG_REGEX) || ['', '', '', '', '']
      this._handleMatch(key, value, metadata)
    }
  }

  private _decodeKeywords(genericMetadata: IGenericMetadata): void {
    const subjectEl = findXMLTag(this._text, 'dc:subject')
    if (!subjectEl) return
    const bagEl = findXMLTag(subjectEl.innerXML, 'rdf:Bag')
    if (!bagEl) return
    const keywords = findXMLTags(bagEl.innerXML, 'rdf:li')
    if (!keywords.length) return
    genericMetadata.DCSubjectBagOfWords = JSON.stringify(keywords.map(item => item.innerXML))
  }

  public extractJPEG(): IBufferLike {
    throw new Error('No image preview available from XMP')
  }

  public extractMetadata(): IGenericMetadata {
    const metadata: IGenericMetadata = {}
    this._decodeAttributeMetadata(metadata)
    this._decodeElementMetadata(metadata)
    this._decodeKeywords(metadata)
    return metadata
  }

  public static isXMP(buffer: IBufferLike): boolean {
    const headers = ['<x:xmpmet', '<?xpacket', '<?xml']

    return headers.some(header => {
      for (let i = 0; i < header.length; i++) {
        if (buffer[i] !== header.charCodeAt(i)) return false
      }

      return true
    })
  }
}
