import {writeFile} from 'fs'

export function writeFileAsync(file: string, buffer: Buffer): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    writeFile(file, buffer, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
