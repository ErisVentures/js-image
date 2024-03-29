import {IGenericMetadata, IBufferLike, XMPTagName} from '../utils/types'
import {xmpTags} from '../utils/tags'
import {createLogger} from '../utils/log'
import {parseKeywords} from '../metadata/keywords-parser'

enum XMPMatchType {
  Element = 'element',
  Attribute = 'attribute',
}

interface IXMPMatch {
  start: number
  length: number
  type: XMPMatchType
}

const writableTags: Record<XMPTagName | 'DateTimeOriginal', boolean> = {
  ...xmpTags,
  DateTimeOriginal: true,
}

const log = createLogger('xmp-encoder')

const XMP_BASE_RDF_DESCRIPTION = `
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
  </rdf:Description>
`.trim()

const XMP_BASE_RDF = `
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  ${XMP_BASE_RDF_DESCRIPTION}
 </rdf:RDF>
`.trim()

const XMP_BASE_FILE = `
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
 ${XMP_BASE_RDF}
</x:xmpmeta>
`.trim()

const XMP_PACKET_START = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>'
const XMP_PACKET_END = '<?xpacket end="w"?>'
const BASE_NEWLINE = '\n   '

export class XMPEncoder {
  public static isWrappedInPacket(xmpData: IBufferLike | string): boolean {
    const firstBytes = xmpData.slice(0, XMP_PACKET_START.length).toString()
    return firstBytes === XMP_PACKET_START
  }

  public static generateWhitespaceOfLength(length: number): string {
    let whitespace = ''
    while (whitespace.length < length) {
      whitespace += whitespace.length % 100 === 0 || whitespace.length === length - 1 ? '\n' : ' '
    }

    return whitespace
  }

  public static wrapInPacket(xmpData: IBufferLike): IBufferLike {
    if (XMPEncoder.isWrappedInPacket(xmpData)) return xmpData

    return Buffer.from(
      [
        XMP_PACKET_START,
        xmpData.toString(),
        XMPEncoder.generateWhitespaceOfLength(2048),
        XMP_PACKET_END,
      ].join('\n'),
    )
  }

  public static encode(metadata: IGenericMetadata, original?: IBufferLike): IBufferLike {
    let {xmpData, extraLength} = XMPEncoder._ensureRdfDescription(original)

    for (const key of Object.keys(metadata)) {
      const tagName = key as keyof IGenericMetadata

      if (!(tagName in writableTags)) {
        log(`skipping ${tagName} which is not a writable tag`)
        continue
      }

      const newXmpData = XMPEncoder._processEntry(xmpData, tagName, metadata[tagName])
      extraLength += newXmpData.length - xmpData.length
      xmpData = newXmpData
    }

    if (XMPEncoder.isWrappedInPacket(xmpData)) {
      const PACKET_END_REGEX = /(\s*)(<\?xpacket end)/im
      const existingWhitespaceMatch = xmpData.match(PACKET_END_REGEX)
      if (!existingWhitespaceMatch) throw new Error('Cannot find XMP packet end')

      const existingWhitespaceLength = existingWhitespaceMatch[1].length
      if (existingWhitespaceLength > extraLength) {
        // We only need to adjust the whitespace if we had enough room to fit our data into it
        log(`adjusting whitespace, our ${extraLength} will fit into ${existingWhitespaceLength}`)
        const indexOfMatch = xmpData.indexOf(existingWhitespaceMatch[0])
        const preamble = xmpData.slice(0, indexOfMatch)
        const postamble = xmpData.slice(indexOfMatch + existingWhitespaceLength)
        const newWhitespaceLength = existingWhitespaceLength - extraLength
        const whitespace = XMPEncoder.generateWhitespaceOfLength(newWhitespaceLength)
        xmpData = `${preamble}${whitespace}${postamble}`
      }
    }

    return Buffer.from(xmpData)
  }

  private static _ensureRdfDescription(
    original: IBufferLike | undefined,
  ): {xmpData: string; extraLength: number} {
    let xmpData = (original || XMP_BASE_FILE).toString()
    let extraLength = 0

    // It already has an rdf:Description, no need to do anything else.
    if (xmpData.includes('<rdf:Description')) {
      return {xmpData, extraLength}
    }

    // It's missing a description but has an rdf:RDF, just inject the description.
    if (xmpData.includes('</rdf:RDF>')) {
      const newData = xmpData.replace(/(\s*)<\/rdf:RDF>/, `${XMP_BASE_RDF_DESCRIPTION}$1</rdf:RDF>`)
      extraLength += newData.length - xmpData.length
      xmpData = newData
      return {xmpData, extraLength}
    }

    // It's missing rdf:RDf completely, inject everything
    if (xmpData.includes('</x:xmpmeta>')) {
      const newData = xmpData.replace(/(\s*)<\/x:xmpmeta>/, `${XMP_BASE_RDF}$1</x:xmpmeta>`)
      extraLength += newData.length - xmpData.length
      xmpData = newData
      return {xmpData, extraLength}
    }

    throw new Error(`XMP data did not contain any discernible rdf markers:\n${xmpData}`)
  }

  private static _processEntry(
    xmpData: string,
    tagName: keyof IGenericMetadata,
    value: string | number | undefined,
  ): string {
    log(`processing ${tagName}`)
    const existing = XMPEncoder._findExisting(xmpData, tagName)

    // If we are unsetting, branch.
    if (typeof value === 'undefined') {
      if (!existing) {
        // If we didn't have an existing value to begin with, we're done.
        log(`${tagName} already missing from XMP, skipping`)
        return xmpData
      }

      log(`unsetting ${tagName}`)

      // Remove the existing reference and cleanup whitespace
      let preamble = xmpData.slice(0, existing.start)
      const postamble = xmpData.slice(existing.start + existing.length)
      if (postamble.match(/^(\n|>)/)) preamble = preamble.replace(/\n +$/, '')

      return `${preamble}${postamble}`
    }

    log(`writing ${tagName} with value "${value}"`)

    if (existing) {
      // If we have an existing value, replace the token range with our new payload
      log(`found existing ${tagName}`)
      const preamble = xmpData.slice(0, existing.start)
      const postamble = xmpData.slice(existing.start + existing.length)
      const replacement = XMPEncoder._buildReplacement(tagName, value, existing.type)
      return `${preamble}${replacement}${postamble}`
    } else {
      // If we don't have an existing value, inject the payload with appropriate whitespace.
      log(`did not find existing ${tagName}`)
      const insertionIndex = XMPEncoder._findInsertionPoint(xmpData, tagName).start
      const preamble = xmpData.slice(0, insertionIndex)
      const postamble = xmpData.slice(insertionIndex)
      const replacement = XMPEncoder._buildReplacement(tagName, value, XMPMatchType.Attribute)
      const replacementWithNewline = `${BASE_NEWLINE}${replacement}`
      return `${preamble}${replacementWithNewline}${postamble}`
    }
  }

  private static _findWithRegex(
    xmp: string,
    regex: RegExp,
    type: XMPMatchType,
  ): IXMPMatch | undefined {
    const match = xmp.match(regex)
    if (!match) return
    return {start: match.index!, length: match[0].length, type}
  }

  private static _findExisting(xmp: string, tagName: string): IXMPMatch | undefined {
    if (tagName === 'DCSubjectBagOfWords')
      return this._findWithRegex(xmp, /<dc:subject>(.|\s)*?<\/dc:subject>/, XMPMatchType.Element)
    const attributeRegex = new RegExp(`([a-z]+):(${tagName})="(.*?)"`, 'i')
    const attributeMatch = this._findWithRegex(xmp, attributeRegex, XMPMatchType.Attribute)
    if (attributeMatch) return attributeMatch
    const elementRegex = new RegExp(`<([a-z]+:${tagName})(\\s*/>|(.*?)</\\1>)`, 'i')
    return this._findWithRegex(xmp, elementRegex, XMPMatchType.Element)
  }

  private static _findInsertionPoint(
    xmp: string,
    tagName: keyof IGenericMetadata,
  ): {start: number} {
    const regex = /<rdf:Description[^<]*?>/im
    const match = xmp.match(regex)
    if (!match) throw new Error('Unable to find end of rdf:description')
    const rdfDescription = match[0]
    const isSelfClosing = rdfDescription.endsWith('/>')
    const rdfDescriptionEndIndex = xmp.indexOf(rdfDescription) + rdfDescription.length - 1
    let start = rdfDescriptionEndIndex + (tagName === 'DCSubjectBagOfWords' ? 1 : 0)
    if (isSelfClosing) {
      if (tagName === 'DCSubjectBagOfWords') {
        throw new Error('Keywords not supported in self-closing XMP tag')
      }

      start -= 1
    }

    return {start}
  }

  private static _buildReplacement(
    tagName: keyof IGenericMetadata,
    value: string | number,
    type: XMPMatchType,
  ): string {
    if (tagName === 'DCSubjectBagOfWords') {
      const keywords = parseKeywords({DCSubjectBagOfWords: value})
      if (!keywords) throw new Error('Invalid keywords payload')
      return [
        `<dc:subject>`,
        ` <rdf:Bag>`,
        ...keywords.map(word => `  <rdf:li>${word.replace(/</g, '')}</rdf:li>`),
        ` </rdf:Bag>`,
        `</dc:subject>`,
      ].join(BASE_NEWLINE)
    }

    const namespace = tagName === 'DateTimeOriginal' ? 'exif' : 'xmp'
    if (type === XMPMatchType.Attribute) {
      return `${namespace}:${tagName}="${value}"`
    } else {
      return `<${namespace}:${tagName}>${value}</${namespace}:${tagName}>`
    }
  }
}
