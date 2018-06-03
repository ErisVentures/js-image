import {decode as canvasDecode, encode as canvasEncode} from './canvas-encoder'

export class PNG {
  public static get sync(): any {
    return {
      read(buffer: Uint8Array): Promise<ImageData> {
        return canvasDecode(buffer)
      },
      write(imageData: ImageData): Promise<Uint8Array> {
        return canvasEncode(imageData, 'image/png')
      },
    }
  }
}
