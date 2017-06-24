importScripts('bundle.js')

const {Image, ImageData} = self['@ouranos/image']

function processImage(imageData, options) {
  Promise.resolve()
    .then(() => Image.from(imageData))
    .then(image => {
      console.log('Processing with options', options)
      if (options['resize[method]']) {
        image = image.resize({
          width: Number(options['resize[width]']),
          height: Number(options['resize[height]']),
        })
      }

      if (options['edges[method]']) {
        image = image.edges({
          method: options['edges[method]'],
          radius: Number(options['edges[radius]']),
          blurSigma: Number(options['edges[blurSigma]']),
        })
      }

      return image
    })
    .then(image => image.toImageData())
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
    processImage(message.data.payload.data, message.data.payload.settings)
  } else {
    throw new Error(`Unrecognized message: ${message.data}`)
  }
})
