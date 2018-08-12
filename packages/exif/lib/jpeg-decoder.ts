import {Decoder as RawDecoder} from 'raw-decoder'
import {Endian, Reader, BufferLike} from 'raw-decoder/dist/reader'

const EXIF_HEADER = 0x45786966 // "Exif"
const APP1 = 0xffe1
const START_OF_IMAGE = 0xffd8
const START_OF_FRAME0 = 0xffc0
const START_OF_FRAME1 = 0xffc1
const START_OF_FRAME2 = 0xffc2
const START_OF_SCAN = 0xffda
const END_OF_IMAGE = 0xffd9

function bufferFromNumber(x: number, minSize: number = 2): BufferLike {
  let buffer = Buffer.from(x.toString(16), 'hex')
  if (buffer.length < minSize) {
    buffer = Buffer.concat([Buffer.alloc(minSize - buffer.length), buffer])
  }

  return buffer
}

type Marker = [number, BufferLike, boolean]

export class JPEGDecoder {
  private readonly _buffer: BufferLike
  private readonly _reader: Reader

  private _markers: Marker[] | undefined
  private _width: number | undefined
  private _height: number | undefined
  private _exifBuffers: BufferLike[] | undefined

  public constructor(buffer: BufferLike) {
    this._buffer = buffer
    this._reader = new Reader(buffer)
    this._reader.setEndianess(Endian.Big)
  }

  public _readFileMarkers(): void {
    if (this._markers) {
      return
    }

    const markers: Marker[] = [[START_OF_IMAGE, Buffer.from([]), false]]
    const reader = this._reader
    const exifBuffers = []
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
      markers.push([marker, markerBuffer, false])
      // Skip over the length we just read
      reader.skip(2)

      if (marker === APP1) {
        // Read the EXIF data from APP1 Marker
        const nextPosition = reader.getPosition() + length
        const header = reader.read(4)
        if (header !== EXIF_HEADER) {
          reader.seek(nextPosition)
          marker = reader.read(2)
          continue
        }

        // mark the last marker as an EXIF marker
        markers[markers.length - 1][2] = true

        // skip over the 2 empty bytes
        reader.skip(2)
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

    markers.push([marker, this._buffer.slice(reader.getPosition()), false])

    this._markers = markers
    this._exifBuffers = exifBuffers
  }

  // TODO: remove this any
  public extractMetadata(): any {
    this._readFileMarkers()

    const metadata = {
      ImageHeight: this._height,
      ImageWidth: this._width,
    }
    for (const exifBuffer of this._exifBuffers!) {
      const decoder = new RawDecoder(exifBuffer)
      Object.assign(metadata, decoder.extractMetadata())
    }

    return metadata
  }

  public extractMetadataBuffer(): BufferLike | undefined {
    this._readFileMarkers()
    return this._exifBuffers![0]
  }

  public static isJPEG(buffer: BufferLike): boolean {
    return buffer[0] === 0xff && buffer[1] === 0xd8
  }

  public static injectMetadata(jpegBuffer: BufferLike, exifBuffer: BufferLike): BufferLike {
    const decoder = new JPEGDecoder(jpegBuffer)
    decoder._readFileMarkers()

    const buffers: BufferLike[] = []
    for (const [marker, buffer, isEXIF] of decoder._markers!) {
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
