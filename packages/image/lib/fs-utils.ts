import {BufferLike} from './types'
import {writeFile} from 'fs'

export function writeFileAsync(file: string, buffer: BufferLike): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    writeFile(file, Buffer.from(buffer as any[]), err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
