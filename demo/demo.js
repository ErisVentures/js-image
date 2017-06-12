let imageData, processStartTs, hideNotifierTimeout

const ImageData = window['@ouranos/image'].ImageData

const settings = {}
const worker = new Worker('worker.js')
const settingInputs = [...document.querySelectorAll('input, select')]

function setLoading(isLoading) {
  document.querySelector('.editor').classList.toggle('editor--loading', !!isLoading)
}

function setNotifier(text, isError, persist) {
  if (hideNotifierTimeout) clearTimeout(hideNotifierTimeout)
  const messageEl = document.querySelector('.user-message')
  messageEl.textContent = text || ''
  messageEl.style.display = 'block'
  messageEl.classList.toggle('alert-info', !isError)
  messageEl.classList.toggle('alert-danger', Boolean(isError))

  const editorEl = document.querySelector('.editor')
  editorEl.classList.toggle('editor--has-error', Boolean(isError))

  if (!isError && !persist) {
    hideNotifierTimeout = setTimeout(() => messageEl.style.display = 'none', 5000)
  }
}

function setFormsDisabledState(areDisabled) {
  settingInputs.forEach(input => input.disabled = areDisabled)
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

function refreshPreview() {
  setNotifier('Processing image...', false, true)
  setLoading(true)
  processStartTs = performance.now()
  worker.postMessage({
    type: 'process',
    payload: {data: imageData, settings},
  })
}

function handleDrop(e) {
  e.stopPropagation()
  e.preventDefault()

  const file = e.dataTransfer.files[0]
  const reader = new FileReader()
  reader.addEventListener('loadend', () => {
    ImageData.from(reader.result).then(data => {
      imageData = data
      setFormsDisabledState(false)
      refreshPreview()
    })
  })
  reader.readAsArrayBuffer(file)

  // used for idiomatic chaining `handleDrop() && command2()`
  return true
}

function handleSettingsChange() {
  for (const input of settingInputs) {
    settings[input.name] = input.value
  }
  refreshPreview()
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

function listenForSettingsChange() {
  for (const input of settingInputs) {
    input.addEventListener('change', handleSettingsChange)
  }
}

function listenForWorkerMessages() {
  worker.addEventListener('message', message => {
    if (message.data.type === 'processed') {
      updateCanvasContext(message.data.payload.imageData)
      const time = Math.ceil(performance.now() - processStartTs)
      setNotifier(`Processing image took ${time} ms`)
      setLoading(false)
    } else if (message.data.type === 'error') {
      const error = message.data.payload
      setNotifier(`${error.name}: ${error.message}`, true)
      setLoading(false)
    } else {
      setNotifier(`Unexpected message: ${message.data}`, true)
      console.error(message)
    }
  })
}

setFormsDisabledState(true)
listenForFileDrop()
listenForSettingsChange()
listenForWorkerMessages()
