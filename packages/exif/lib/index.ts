import {JPEGDecoder} from './decoder/jpeg-decoder'
import {FUJI_MAGIC_STRING, FujiDecoder} from './decoder/fuji-decoder'
import {Cr3Decoder} from './decoder/cr3-decoder'
import {TIFFDecoder} from './decoder/tiff-decoder'
import {XMPDecoder} from './decoder/xmp-decoder'
import {TIFFEncoder} from './encoder/tiff-encoder'
import {XMPEncoder} from './encoder/xmp-encoder'
import {normalizeMetadata} from './metadata/normalize'
import {IDecoder, IBufferLike, INormalizedMetadata} from './utils/types'

function isDecoder(obj: any): obj is IDecoder {
  return typeof (obj as any).extractMetadata === 'function'
}

function isLikelyFuji(buffer: IBufferLike): boolean {
  for (let i = 0; i < FUJI_MAGIC_STRING.length; i++) {
    if (buffer[i] !== FUJI_MAGIC_STRING.charCodeAt(i)) return false
  }

  return true
}

function createDecoder_(bufferOrDecoder: IBufferLike | IDecoder): IDecoder | undefined {
  if (isDecoder(bufferOrDecoder)) {
    return bufferOrDecoder
  } else if (isLikelyFuji(bufferOrDecoder)) {
    return new FujiDecoder(bufferOrDecoder)
  } else if (Cr3Decoder.isLikelyCr3(bufferOrDecoder)) {
    return new Cr3Decoder(bufferOrDecoder)
  } else if (TIFFDecoder.isLikelyTIFF(bufferOrDecoder)) {
    return new TIFFDecoder(bufferOrDecoder)
  } else if (JPEGDecoder.isLikelyJPEG(bufferOrDecoder)) {
    return new JPEGDecoder(bufferOrDecoder)
  } else if (XMPDecoder.isXMP(bufferOrDecoder)) {
    return new XMPDecoder(bufferOrDecoder)
  }
}

export function isParseable(buffer: IBufferLike): boolean {
  return !!createDecoder_(buffer)
}

export function createDecoder(bufferOrDecoder: IBufferLike | IDecoder): IDecoder {
  const decoder = createDecoder_(bufferOrDecoder)
  if (!decoder) throw new Error('Unrecognizable file type')
  return decoder
}

export function parse(bufferOrDecoder: IBufferLike | IDecoder): INormalizedMetadata {
  return normalizeMetadata(createDecoder(bufferOrDecoder).extractMetadata())
}

export {
  normalizeMetadata,
  TIFFDecoder,
  FujiDecoder,
  JPEGDecoder,
  XMPDecoder,
  TIFFEncoder,
  XMPEncoder,
}

export {IGenericMetadata, INormalizedMetadata, IParsedLens, IFDTagName} from './utils/types'
