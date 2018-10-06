importScripts('bundle.js')

const {Image, ImageData} = self['@eris/image']

async function loadWASM() {
  const response = await fetch('bundle.wasm')
  const bytes = await response.arrayBuffer()
  const wasmModule = await WebAssembly.instantiate(bytes, {})
  self['@eris/image-wasm'] = {wasmModule}
}

function parseOptions(rawOptions) {
  const options = {}

  for (const [name, value] of Object.entries(rawOptions)) {
    const valueAsNumber = Number(value)
    const [_, sectionName, propName] = name.match(/^(.*)\[(.*)\]$/)
    const section = options[sectionName] || {}
    section[propName] = Number.isFinite(valueAsNumber) ? valueAsNumber : value
    options[sectionName] = section
    if (propName === 'curve') {
      section.curve = value
        .trim()
        .split('\n')
        .map(row => row.split(',').map(n => Number(n)))
    }
  }

  return options
}

function processImage(imageData, rawOptions) {
  Promise.resolve()
    .then(() => Image.from(imageData))
    .then(image => {
      const options = parseOptions(rawOptions)

      console.log('Processing with options', rawOptions, options)
      if (options.resize && options.resize.method) {
        image = image.resize(options.resize)
      }

      if (options.calibrate) {
        image = image.calibrate(options.calibrate)
      }

      if (options.tone) {
        image = image.tone(options.tone)
      }

      if (options.edges && options.edges.method) {
        image = image.edges(options.edges)
      }

      if (options.sharpen && options.sharpen.strength) {
        image = image.sharpen(options.sharpen)
      }

      const analysis = {}
      if (rawOptions['analysis[hash]']) {
        analysis.hash = {}
      }

      if (rawOptions['analysis[sharpness]']) {
        analysis.sharpness = {}
      }

      return image.analyze(analysis)
    })
    .then(image => Promise.all([image.toAnalysis(), image.toImageData().then(ImageData.toRGBA)]))
    .then(([analysis, imageData]) => {
      self.postMessage(
        {
          type: 'processed',
          payload: {
            analysis,
            imageData: {
              width: imageData.width,
              height: imageData.height,
              data: imageData.data,
            },
          },
        },
        undefined,
        [imageData.data],
      )
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

loadWASM()

self.addEventListener('message', message => {
  if (message.data.type === 'process') {
    processImage(message.data.payload.data, message.data.payload.settings)
  } else {
    throw new Error(`Unrecognized message: ${message.data}`)
  }
})
