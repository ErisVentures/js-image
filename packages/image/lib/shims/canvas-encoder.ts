function getCanvas(): HTMLCanvasElement {
  if ('__canvas__' in self) {
    return (self as any).__canvas__ as HTMLCanvasElement
  }

  return document.createElement('canvas')
}

function read<T>(doRead: (reader: FileReader) => any): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('loadend', () => resolve(reader.result))
    doRead(reader)
  })
}

export function decode(buffer: Uint8Array|string): Promise<ImageData> {
  const canvas = getCanvas()
  const context = canvas.getContext('2d')

  return new Promise<ImageData>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('error', reject)
    img.addEventListener('load', () => {
      try {
        canvas.width = img.width
        canvas.height = img.height
        context!.drawImage(img, 0, 0)
        const imageData = context!.getImageData(0, 0, img.width, img.height)
        resolve({
          width: imageData.width,
          height: imageData.height,
          data: imageData.data,
        })
      } catch (err) {
        reject(err)
      }
    })

    if (typeof buffer === 'string') {
      img.src = buffer
    } else {
      read<string>(reader => reader.readAsDataURL(new Blob([buffer])))
        .then(url => { img.src = url })
        .catch(reject)
    }
  })
}

export function encode(
  imageData: ImageData,
  dataType: string,
  quality?: number,
): Promise<Uint8Array> {
  const canvas = getCanvas()
  const context = canvas.getContext('2d')
  canvas.width = imageData.width
  canvas.height = imageData.height
  context!.putImageData(imageData, 0, 0)

  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        return reject(new Error('failed to convert canvas to blob'))
      }

      read<ArrayBuffer>(reader => reader.readAsArrayBuffer(blob!))
        .then(arrayBuffer => { resolve(new Uint8Array(arrayBuffer)) })
        .catch(reject)
    }, dataType, quality)
  })
}
