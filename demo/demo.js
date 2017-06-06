let imageData, processStartTs

const ImageData = window['@ouranos/image'].ImageData

const worker = new Worker('worker.js')
worker.addEventListener('message', message => {
  if (message.data.type === 'processed') {
    updateCanvasContext(message.data.payload.imageData)
    const time = Math.ceil(performance.now() - processStartTs)
    setNotifier(`Processing image took ${time} ms`)
    setLoading(false)
  } else if (message.data.type === 'error') {
    const error = message.data.payload
    setLoading(false)
    setNotifier(`${error.name}: ${error.message}`, true)
  } else {
    setNotifier(`Unexpected message: ${message.data}`, true)
    console.error(message)
  }
})

function setLoading(isLoading) {
  document.querySelector('.editor').classList.toggle('editor--loading', !!isLoading)
}

function setNotifier(text, isError) {
  const messageEl = document.querySelector('.user-message')
  messageEl.textContent = text || ''
  messageEl.style.display = 'block'
  messageEl.classList.toggle('alert-info', !isError)
  messageEl.classList.toggle('alert-danger', Boolean(isError))
}

function updateCanvasContext(rawImageData) {
  const container = document.querySelector('.preview')
  container.classList.add('preview--filled')
  const canvas = document.querySelector('#preview-canvas')
  const context = canvas.getContext('2d')
  canvas.width = rawImageData.width
  canvas.height = rawImageData.height
  const clamped = new Uint8ClampedArray(rawImageData.data)
  const imageData = new window.ImageData(clamped, rawImageData.width, rawImageData.height)
  context.putImageData(imageData, 0, 0)
}

function handleDrop(e) {
  e.stopPropagation()
  e.preventDefault()

  const file = e.dataTransfer.files[0]
  const reader = new FileReader()
  reader.addEventListener('loadend', () => {
    ImageData.from(reader.result).then(data => {
      imageData = data
      refreshPreview()
    })
  })
  reader.readAsArrayBuffer(file)

  // used for idiomatic chaining `handleDrop() && command2()`
  return true
}

function listenForFileDrop() {
  const dropzone = document.querySelector('.dropzone')
  const onDragStart = () => dropzone.classList.add('dropzone--drag')
  const onDragEnd = () => dropzone.classList.remove('dropzone--drag')

  document.addEventListener('dragenter', onDragStart)
  document.addEventListener('mouseleave', onDragEnd)
  document.addEventListener('dragover', e => e.preventDefault())
  document.addEventListener('drop', e => handleDrop(e) && onDragEnd())
}

function refreshPreview() {
  setNotifier('Processing image...')
  setLoading(true)
  processStartTs = performance.now()
  worker.postMessage({
    type: 'process',
    payload: {data: imageData},
  })
}

listenForFileDrop()
