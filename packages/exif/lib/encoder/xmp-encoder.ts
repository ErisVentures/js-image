import {IGenericMetadata, IBufferLike} from '../utils/types'
import {xmpTags} from '../utils/tags'
import {createLogger} from '../utils/log'
import {parseKeywords} from '../metadata/keywords-parser'

const log = createLogger('xmp-encoder')

const XMP_BASE_FILE = `
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:aux="http://ns.adobe.com/exif/1.0/aux/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
    xmlns:stEvt="http://ns.adobe.com/xap/1.0/sType/ResourceEvent#"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/">
  </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
`.trim()

const XMP_PACKET_START = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>'
const XMP_PACKET_END = '<?xpacket end="w"?>'
const BASE_NEWLINE = '\n   '

interface TagLocation {
  start: number
  length: number
  prefix: string
  name: string
  value: string
}

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
    let xmpData = (original || XMP_BASE_FILE).toString()
    let extraLength = 0

    for (const key of Object.keys(metadata)) {
      const tagName = key as keyof IGenericMetadata
      log(`examining ${tagName}`)
      if (!(tagName in xmpTags)) continue

      const value = metadata[tagName]

      if (tagName === 'DCSubjectBagOfWords') {
        const result = XMPEncoder._handleKeywords(xmpData, metadata)
        xmpData = result.xmpData
        extraLength += result.extraLength
        continue
      }

      if (typeof value === 'undefined') {
        log(`unsetting ${tagName}`)
        const existing = XMPEncoder._findExistingTag(xmpData, tagName)
        if (!existing) continue
        let preamble = xmpData.slice(0, existing.start)
        const postamble = xmpData.slice(existing.start + existing.length)
        if (postamble.startsWith('\n')) preamble = preamble.replace(/\n +$/, '')
        const beforeLength = xmpData.length
        xmpData = `${preamble}${postamble}`
        const afterLength = xmpData.length
        extraLength += afterLength - beforeLength
        continue
      }

      log(`writing ${tagName} as "${value}"`)

      const existing = XMPEncoder._findExistingTag(xmpData, tagName)
      const replacement = `xmp:${tagName}="${value}"`

      if (existing) {
        log(`found existing ${tagName} - ${existing.value}`)
        const preamble = xmpData.slice(0, existing.start)
        const postamble = xmpData.slice(existing.start + existing.length)
        const additionalLength = replacement.length - existing.length
        xmpData = `${preamble}${replacement}${postamble}`
        extraLength += additionalLength
      } else {
        log(`did not find existing ${tagName}`)
        const rdfEnd = XMPEncoder._findIndexOfRdfDescriptionEnd(xmpData)
        const preamble = xmpData.slice(0, rdfEnd)
        const postamble = xmpData.slice(rdfEnd)
        const replacementWithNewline = `${BASE_NEWLINE}${replacement}`
        xmpData = `${preamble}${replacementWithNewline}${postamble}`
        extraLength += replacementWithNewline.length
      }
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

  private static _findExistingTag(xmp: string, tagName: string): TagLocation | undefined {
    const regex = new RegExp(`([a-z]+):(${tagName})="(.*?)"`, 'i')
    const match = xmp.match(regex)
    if (!match) return undefined
    const [fullMatch, prefix, name, value] = match
    const start = xmp.indexOf(fullMatch)
    return {start, length: fullMatch.length, prefix, name, value}
  }

  private static _handleKeywords(
    xmpData: string,
    metadata: IGenericMetadata,
  ): {xmpData: string; extraLength: number} {
    const newKeywords = parseKeywords(metadata)
    const existingKeywordsMatch = xmpData.match(/<dc:subject>(.|\s)*?<\/dc:subject>/)
    if (!newKeywords || !newKeywords.length) {
      // Nothing to remove, move on
      if (!existingKeywordsMatch) return {xmpData, extraLength: 0}
      // Remove the payload
      const indexOfMatch = existingKeywordsMatch.index!
      const original = existingKeywordsMatch[0]
      const preamble = xmpData.slice(0, indexOfMatch)
      const postamble = xmpData.slice(indexOfMatch + original.length)
      return {
        xmpData: `${preamble}${postamble}`,
        extraLength: -original.length,
      }
    }

    const replacement = XMPEncoder._generateKeywordsPayload(newKeywords)
    if (existingKeywordsMatch) {
      const indexOfMatch = existingKeywordsMatch.index!
      const original = existingKeywordsMatch[0]
      const preamble = xmpData.slice(0, indexOfMatch)
      const postamble = xmpData.slice(indexOfMatch + original.length)
      return {
        xmpData: `${preamble}${replacement}${postamble}`,
        extraLength: replacement.length - original.length,
      }
    } else {
      const rdfEnd = XMPEncoder._findIndexOfRdfDescriptionEnd(xmpData) + 1
      const preamble = xmpData.slice(0, rdfEnd)
      const postamble = xmpData.slice(rdfEnd)
      const replacementWithNewline = `${BASE_NEWLINE}${replacement}`

      return {
        xmpData: `${preamble}${replacementWithNewline}${postamble}`,
        extraLength: replacementWithNewline.length,
      }
    }
  }

  private static _generateKeywordsPayload(keywords: string[]): string {
    return [
      `<dc:subject>`,
      ` <rdf:Bag>`,
      ...keywords.map(word => `  <rdf:li>${word.replace(/</g, '')}</rdf:li>`),
      ` </rdf:Bag>`,
      `</dc:subject>`,
    ].join(BASE_NEWLINE)
  }

  private static _findIndexOfRdfDescriptionEnd(xmp: string): number {
    const regex = /<rdf:Description(\s*(\w+:\w+=".*?")\s*)*?>/im
    const match = xmp.match(regex)
    if (!match) throw new Error('Unable to find end of rdf:description')
    const rdfDescription = match[0]
    return xmp.indexOf(rdfDescription) + rdfDescription.length - 1
  }
}
