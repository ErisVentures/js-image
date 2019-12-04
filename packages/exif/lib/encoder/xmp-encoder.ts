import {IGenericMetadata, IBufferLike, XMPTagName, IFDTagName} from '../utils/types'
import {xmpTags} from '../utils/tags'
import {createLogger} from '../utils/log'
import {parseKeywords} from '../metadata/keywords-parser'

const writableTags: Record<XMPTagName | 'DateTimeOriginal', boolean> = {
  ...xmpTags,
  DateTimeOriginal: true,
}

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
    const replacement = XMPEncoder._buildReplacement(tagName, value)

    if (existing) {
      // If we have an existing value, replace the token range with our new payload
      log(`found existing ${tagName}`)
      const preamble = xmpData.slice(0, existing.start)
      const postamble = xmpData.slice(existing.start + existing.length)
      return `${preamble}${replacement}${postamble}`
    } else {
      // If we don't have an existing value, inject the payload with appropriate whitespace.
      log(`did not find existing ${tagName}`)
      const insertionIndex = XMPEncoder._findInsertionPoint(xmpData, tagName).start
      const preamble = xmpData.slice(0, insertionIndex)
      const postamble = xmpData.slice(insertionIndex)
      const replacementWithNewline = `${BASE_NEWLINE}${replacement}`
      return `${preamble}${replacementWithNewline}${postamble}`
    }
  }

  private static _findExisting(
    xmp: string,
    tagName: string,
  ): {start: number; length: number} | undefined {
    const regex =
      tagName === 'DCSubjectBagOfWords'
        ? /<dc:subject>(.|\s)*?<\/dc:subject>/
        : new RegExp(`([a-z]+):(${tagName})="(.*?)"`, 'i')
    const match = xmp.match(regex)
    if (!match) return
    return {start: match.index!, length: match[0].length}
  }

  private static _findInsertionPoint(
    xmp: string,
    tagName: keyof IGenericMetadata,
  ): {start: number} {
    const regex = /<rdf:Description[^<]*?>/im
    const match = xmp.match(regex)
    if (!match) throw new Error('Unable to find end of rdf:description')
    const rdfDescription = match[0]
    const rdfDescriptionEndIndex = xmp.indexOf(rdfDescription) + rdfDescription.length - 1
    const start = rdfDescriptionEndIndex + (tagName === 'DCSubjectBagOfWords' ? 1 : 0)
    return {start}
  }

  private static _buildReplacement(
    tagName: keyof IGenericMetadata,
    value: string | number,
  ): string {
    if (tagName === 'DateTimeOriginal') return `exif:DateTimeOriginal="${value}"`
    if (tagName !== 'DCSubjectBagOfWords') return `xmp:${tagName}="${value}"`
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
}
