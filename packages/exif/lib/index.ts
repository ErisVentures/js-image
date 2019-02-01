import {JPEGDecoder} from './decoder/jpeg-decoder'
import {TIFFDecoder} from './decoder/tiff-decoder'
import {XMPDecoder} from './decoder/xmp-decoder'
import {TIFFEncoder} from './encoder/tiff-encoder'
import {normalizeMetadata} from './metadata/normalize'
import {IDecoder, IBufferLike, INormalizedMetadata} from './utils/types'

function isTIFFDecoder(obj: any): obj is IDecoder {
  return typeof (obj as any).extractMetadata === 'function'
}

function isLikelyTIFF(buffer: IBufferLike): boolean {
  return (buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4d && buffer[1] === 0x4d)
}

export function createDecoder(bufferOrDecoder: IBufferLike | IDecoder): IDecoder {
  if (isTIFFDecoder(bufferOrDecoder)) {
    return bufferOrDecoder
  } else if (isLikelyTIFF(bufferOrDecoder)) {
    return new TIFFDecoder(bufferOrDecoder)
  } else if (JPEGDecoder.isJPEG(bufferOrDecoder)) {
    return new JPEGDecoder(bufferOrDecoder)
  } else if (XMPDecoder.isXMP(bufferOrDecoder)) {
    return new XMPDecoder(bufferOrDecoder)
  } else {
    throw new Error('Unrecognizable file type')
  }
}

export function parse(bufferOrDecoder: IBufferLike | IDecoder): INormalizedMetadata {
  return normalizeMetadata(createDecoder(bufferOrDecoder).extractMetadata())
}

export {normalizeMetadata, TIFFDecoder, JPEGDecoder, TIFFEncoder}

export {IGenericMetadata, INormalizedMetadata, IParsedLens, IFDTagName} from './utils/types'
