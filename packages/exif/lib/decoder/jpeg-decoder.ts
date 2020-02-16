import {TIFFDecoder} from '../decoder/tiff-decoder'
import {IBufferLike, IReader, Endian, IGenericMetadata} from '../utils/types'
import {Reader} from '../utils/reader'
import {Writer} from '../utils/writer'
import {XMPDecoder} from './xmp-decoder'
import {createLogger} from '../utils/log'

const log = createLogger('jpeg-decoder')

const EXIF_HEADER = 0x45786966 // "Exif"
const XMP_HEADER = 0x68747470 // The "http" in "http://ns.adobe.com/xap/1.0/"
const XMP_URL = 'http://ns.adobe.com/xap/1.0/\x00'
const APP1 = 0xffe1
const START_OF_IMAGE = 0xffd8
const START_OF_FRAME0 = 0xffc0
const START_OF_FRAME1 = 0xffc1
const START_OF_FRAME2 = 0xffc2
const START_OF_SCAN = 0xffda
const END_OF_IMAGE = 0xffd9

function bufferFromNumber(x: number, minSize: number = 2): IBufferLike {
  const writer = new Writer()
  writer.write(x, minSize)
  return writer.toBuffer()
}

interface Marker {
  marker: number
  buffer: IBufferLike
  isEXIF: boolean
  isXMP: boolean
}

interface DecoderState {
  marker: number
  length: number
  nextPosition: number
}

export class JPEGDecoder {
  private readonly _buffer: IBufferLike
  private readonly _reader: IReader

  private _markers: Marker[] | undefined
  private _width: number | undefined
  private _height: number | undefined
  private _exifBuffers: IBufferLike[] | undefined
  private _xmpBuffers: IBufferLike[] | undefined

  public constructor(buffer: IBufferLike) {
    this._buffer = buffer
    this._reader = new Reader(buffer)
    this._reader.setEndianess(Endian.Big)
  }

  private _handleEXIFMarker(state: DecoderState): {nextMarker: number} {
    const reader = this._reader
    const lastMarker = this._markers![this._markers!.length - 1]
    const exifBuffers = this._exifBuffers!

    // mark the last marker as an EXIF marker
    lastMarker.isEXIF = true

    // skip over the 4 header bytes and 2 empty bytes
    reader.skip(6)
    // the data is the rest of the marker (-6 for 2 empty bytes and 4 for EXIF header)
    exifBuffers.push(reader.readAsBuffer(state.length - 6))
    return {nextMarker: reader.read(2)}
  }

  /**
   * @see https://en.wikipedia.org/wiki/Extensible_Metadata_Platform#Example
   * @see https://wwwimages2.adobe.com/content/dam/acom/en/devnet/xmp/pdfs/XMP%20SDK%20Release%20cc-2016-08/XMPSpecificationPart3.pdf
   */
  private _handleXMPMarker(state: DecoderState): {nextMarker: number} {
    const reader = this._reader
    const lastMarker = this._markers![this._markers!.length - 1]
    const xmpBuffers = this._xmpBuffers!

    // Let's double check we're actually looking at XMP data
    const fullHeader = reader.readAsBuffer(XMP_URL.length).toString()
    if (fullHeader !== XMP_URL) {
      // We aren't actually looking at XMP data, let's abort
      reader.seek(state.nextPosition)
      return {nextMarker: reader.read(2)}
    }

    xmpBuffers.push(reader.readAsBuffer(state.length - XMP_URL.length))
    // mark the last marker as an XMP marker
    lastMarker.isXMP = true
    return {nextMarker: reader.read(2)}
  }

  private _handleNonAppMarker(state: DecoderState): {nextMarker: number} {
    const reader = this._reader
    const {marker, nextPosition} = state

    // Skip through the other header payloads that aren't APP1
    // Width and Height information will be in the Start Of Frame (SOFx) payloads
    if (marker === START_OF_FRAME0 || marker === START_OF_FRAME1 || marker === START_OF_FRAME2) {
      reader.skip(1)
      this._height = reader.read(2)
      this._width = reader.read(2)
    }

    reader.seek(nextPosition)
    return {nextMarker: reader.read(2)}
  }

  private _handleMarker(state: DecoderState): {nextMarker: number} {
    const reader = this._reader
    const {marker, nextPosition} = state

    if (marker === APP1) {
      // Read the EXIF/XMP data from APP1 Marker
      const header = reader.use(() => reader.read(4))
      if (header === EXIF_HEADER) {
        return this._handleEXIFMarker(state)
      } else if (header === XMP_HEADER) {
        return this._handleXMPMarker(state)
      } else {
        reader.seek(nextPosition)
        return {nextMarker: reader.read(2)}
      }
    } else if (marker >> 8 === 0xff) {
      return this._handleNonAppMarker(state)
    } else {
      throw new Error(`Unrecognized marker: ${marker.toString(16)}`)
    }
  }

  private _readFileMarkers(): void {
    if (this._markers) {
      return
    }

    const baseMarker = {isEXIF: false, isXMP: false}
    const reader = this._reader
    this._markers = [{marker: START_OF_IMAGE, buffer: Buffer.from([]), ...baseMarker}]
    this._exifBuffers = []
    this._xmpBuffers = []
    reader.seek(2)

    let marker = reader.read(2)
    while (marker !== END_OF_IMAGE && reader.hasNext()) {
      log(`read marker ${marker.toString(16)}`)
      if (marker === START_OF_SCAN) {
        // If we reached the scan data, we won't find anymore metadata, skip to the end
        break
      }

      // Subtract 2 for the length that we already read
      const length = reader.use(() => reader.read(2)) - 2
      const markerBuffer = reader.use(() => reader.readAsBuffer(length + 2))
      // Push the marker and data onto our markers list
      this._markers.push({marker, buffer: markerBuffer, ...baseMarker})
      // Skip over the length we just read
      reader.skip(2)

      const nextPosition = reader.getPosition() + length
      marker = this._handleMarker({marker, nextPosition, length}).nextMarker
    }

    this._markers.push({marker, buffer: this._buffer.slice(reader.getPosition()), ...baseMarker})
  }

  public extractJPEG(): IBufferLike {
    return this._buffer
  }

  public extractMetadata(): IGenericMetadata {
    this._readFileMarkers()

    const metadata: IGenericMetadata = {
      ImageLength: this._height,
      ImageWidth: this._width,
    }

    for (const exifBuffer of this._exifBuffers!) {
      const decoder = new TIFFDecoder(exifBuffer)
      Object.assign(metadata, decoder.extractMetadata())
    }

    for (const xmpBuffer of this._xmpBuffers!) {
      const decoder = new XMPDecoder(xmpBuffer)
      Object.assign(metadata, decoder.extractMetadata())
    }

    return metadata
  }

  public extractEXIFBuffer(): IBufferLike | undefined {
    this._readFileMarkers()
    return this._exifBuffers![0]
  }

  public extractXMPBuffer(): IBufferLike | undefined {
    this._readFileMarkers()
    return this._xmpBuffers![0]
  }

  public static isJPEG(buffer: IBufferLike): boolean {
    try {
      new JPEGDecoder(buffer)._readFileMarkers()
      return true
    } catch (err) {
      log(`not a JPEG, decoding failed with ${err.message}`)
      return false
    }
  }

  public static isLikelyJPEG(buffer: IBufferLike): boolean {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  public static injectEXIFMetadata(jpegBuffer: IBufferLike, exifBuffer: IBufferLike): IBufferLike {
    const decoder = new JPEGDecoder(jpegBuffer)
    decoder._readFileMarkers()

    const hasEXIFDataAlready = decoder._markers!.some(marker => marker.isEXIF)

    const buffers: IBufferLike[] = []
    for (const {marker, buffer, isEXIF} of decoder._markers!) {
      if (isEXIF || (marker === START_OF_IMAGE && !hasEXIFDataAlready)) {
        if (marker === START_OF_IMAGE) buffers.push(bufferFromNumber(START_OF_IMAGE))
        buffers.push(bufferFromNumber(APP1))
        // add 8 bytes to the buffer length
        // 4 bytes for header, 2 bytes of empty space, 2 bytes for length itself
        buffers.push(bufferFromNumber(exifBuffer.length + 8, 2))
        buffers.push(bufferFromNumber(EXIF_HEADER, 4))
        buffers.push(bufferFromNumber(0, 2))
        buffers.push(exifBuffer)
      } else {
        buffers.push(bufferFromNumber(marker), buffer)
      }
    }

    // @ts-ignore - TODO investigate why this is error-y
    return Buffer.concat(buffers)
  }

  public static injectXMPMetadata(jpegBuffer: IBufferLike, xmpBuffer: IBufferLike): IBufferLike {
    const decoder = new JPEGDecoder(jpegBuffer)
    decoder._readFileMarkers()

    const hasXMPDataAlready = decoder._markers!.some(marker => marker.isXMP)

    const buffers: IBufferLike[] = []
    for (const {marker, buffer, isXMP} of decoder._markers!) {
      if (isXMP || (marker === START_OF_IMAGE && !hasXMPDataAlready)) {
        if (marker === START_OF_IMAGE) buffers.push(bufferFromNumber(START_OF_IMAGE))
        buffers.push(bufferFromNumber(APP1))
        // add 2 bytes to the buffer length for length itself
        buffers.push(bufferFromNumber(xmpBuffer.length + XMP_URL.length + 2, 2))
        buffers.push(Buffer.from(XMP_URL))
        buffers.push(xmpBuffer)
      } else {
        buffers.push(bufferFromNumber(marker), buffer)
      }
    }

    // @ts-ignore - TODO investigate why this is error-y
    return Buffer.concat(buffers)
  }
}
