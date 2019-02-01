import {TIFFDecoder} from '../decoder/tiff-decoder'
import {IBufferLike, IReader, Endian, IGenericMetadata} from '../utils/types'
import {Reader} from '../utils/reader'
import {Writer} from '../utils/writer'
import {XMPDecoder} from './xmp-decoder'

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

  public _readFileMarkers(): void {
    if (this._markers) {
      return
    }

    const baseMarker = {isEXIF: false, isXMP: false}
    const markers: Marker[] = [{marker: START_OF_IMAGE, buffer: Buffer.from([]), ...baseMarker}]
    const reader = this._reader
    const exifBuffers: IBufferLike[] = []
    const xmpBuffers: IBufferLike[] = []
    reader.seek(2)

    let marker = reader.read(2)
    while (marker !== END_OF_IMAGE && reader.hasNext()) {
      if (marker === START_OF_SCAN) {
        // If we reached the scan data, we won't find anymore metadata, skip to the end
        break
      }

      // Subtract 2 for the length that we already read
      const length = reader.use(() => reader.read(2)) - 2
      const markerBuffer = reader.use(() => reader.readAsBuffer(length + 2))
      // Push the marker and data onto our markers list
      markers.push({marker, buffer: markerBuffer, ...baseMarker})
      // Skip over the length we just read
      reader.skip(2)

      if (marker === APP1) {
        // Read the EXIF/XMP data from APP1 Marker
        const nextPosition = reader.getPosition() + length
        const header = reader.use(() => reader.read(4))
        // Do a preliminary check if we're facing either situation
        if (header !== EXIF_HEADER && header !== XMP_HEADER) {
          reader.seek(nextPosition)
          marker = reader.read(2)
          continue
        }

        if (header === XMP_HEADER) {
          // Let's double check we're actually looking at XMP data
          const fullHeader = reader.readAsBuffer(XMP_URL.length).toString()
          if (fullHeader !== XMP_URL) {
            // We aren't actually looking at XMP data, let's abort
            reader.seek(nextPosition)
            marker = reader.read(2)
            continue
          }

          xmpBuffers.push(reader.readAsBuffer(length - XMP_URL.length))
          // mark the last marker as an XMP marker
          markers[markers.length - 1].isXMP = true

          marker = reader.read(2)
          continue
        }

        // mark the last marker as an EXIF marker
        markers[markers.length - 1].isEXIF = true

        // skip over the 4 header bytes and 2 empty bytes
        reader.skip(6)
        // the data is the rest of the marker (-6 for 2 empty bytes and 4 for EXIF header)
        exifBuffers.push(reader.readAsBuffer(length - 6))
        marker = reader.read(2)
      } else if (marker >> 8 === 0xff) {
        // Skip through the other header payloads that aren't APP1
        const nextPosition = reader.getPosition() + length

        // Width and Height information will be in the Start Of Frame (SOFx) payloads
        if (
          marker === START_OF_FRAME0 ||
          marker === START_OF_FRAME1 ||
          marker === START_OF_FRAME2
        ) {
          reader.skip(1)
          this._height = reader.read(2)
          this._width = reader.read(2)
        }

        reader.seek(nextPosition)
        marker = reader.read(2)
      } else {
        throw new Error(`Unrecognized marker: ${marker.toString(16)}`)
      }
    }

    markers.push({marker, buffer: this._buffer.slice(reader.getPosition()), ...baseMarker})

    this._markers = markers
    this._exifBuffers = exifBuffers
    this._xmpBuffers = xmpBuffers
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

  public extractMetadataBuffer(): IBufferLike | undefined {
    this._readFileMarkers()
    return this._exifBuffers![0]
  }

  public static isJPEG(buffer: IBufferLike): boolean {
    return buffer[0] === 0xff && buffer[1] === 0xd8
  }

  public static injectMetadata(jpegBuffer: IBufferLike, exifBuffer: IBufferLike): IBufferLike {
    const decoder = new JPEGDecoder(jpegBuffer)
    decoder._readFileMarkers()

    const buffers: IBufferLike[] = []
    for (const {marker, buffer, isEXIF} of decoder._markers!) {
      if (marker === START_OF_IMAGE) {
        buffers.push(bufferFromNumber(START_OF_IMAGE))
        buffers.push(bufferFromNumber(APP1))
        buffers.push(bufferFromNumber(exifBuffer.length + 8))
        buffers.push(bufferFromNumber(EXIF_HEADER, 4))
        buffers.push(bufferFromNumber(0, 2))
        buffers.push(exifBuffer)
      } else if (!isEXIF) {
        buffers.push(bufferFromNumber(marker), buffer)
      }
    }

    // @ts-ignore - TODO investigate why this is error-y
    return Buffer.concat(buffers)
  }
}
