import {BufferLike} from './types'
import {writeFile} from 'fs'

export function writeFileAsync(file: string, buffer: BufferLike): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    writeFile(file, Buffer.from(buffer as any[]), err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
