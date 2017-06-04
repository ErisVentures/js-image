import {decode as canvasDecode, encode as canvasEncode} from './canvas-encoder'

export function decode(buffer: Uint8Array): Promise<ImageData> {
  return canvasDecode(buffer)
}

export function encode(imageData: ImageData, quality: number): Promise<Uint8Array> {
  return canvasEncode(imageData, 'image/jpeg', quality)
}
