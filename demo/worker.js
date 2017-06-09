importScripts('bundle.js')

const {Image, ImageData} = self['@ouranos/image']

function processImage(imageData, options) {
  const image = Image.from(imageData)

  image
    .edges(Image.CANNY)
    .toImageData()
    .then(ImageData.toRGBA)
    .then(imageData => {
      self.postMessage({
        type: 'processed',
        payload: {
          imageData: {
            width: imageData.width,
            height: imageData.height,
            data: imageData.data,
          },
        },
      }, undefined, [imageData.data])
    })
    .catch(err => {
      console.error(err)
      self.postMessage({
        type: 'error',
        payload: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
      })
    })
}

self.addEventListener('message', message => {
  if (message.data.type === 'process') {
    processImage(message.data.payload.data, message.data.payload.options)
  } else {
    throw new Error(`Unrecognized message: ${message.data}`)
  }
})
