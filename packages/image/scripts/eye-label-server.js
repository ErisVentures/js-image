const fs = require('fs')
const path = require('path')
const express = require('express')

if (process.argv.length !== 3) {
  console.error('USAGE: eye-label-server.js <input_dir>')
  console.error(process.argv)
  process.exit(1)
}

async function run() {
  const inputDir = path.resolve(process.cwd(), process.argv[2])

  const files = fs.readdirSync(inputDir)
  let currentFileIndex = 0

  const labelsFilePath = path.join(inputDir, '0000-labels.json')
  const labels = fs.existsSync(labelsFilePath) ? require(labelsFilePath) : []

  function saveLabels() {
    fs.writeFileSync(labelsFilePath, JSON.stringify(labels, null, 2))
  }

  function getNextFace() {
    for (let i = currentFileIndex; i < files.length; i++) {
      const fileName = files[i]
      if (!fileName.match(/face-\d+-\d+.jpg$/)) continue
      if (labels.some(label => label.file === fileName)) continue

      const eyeFileName = fileName
      const faceFileName = fileName.replace(/-\d+.jpg$/, '.jpg')

      return {
        index: i,
        eyeFileName,
        faceFileName,
        eyeData: fs.readFileSync(path.join(inputDir, eyeFileName), 'base64'),
        faceData: fs.readFileSync(path.join(inputDir, faceFileName), 'base64'),
      }
    }
  }

  const app = express()
  app.use(require('body-parser').json())
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'eye-label-ui.html')))
  app.get('/next', (req, res) => {
    try {
      console.log('Finding next face...')
      const next = getNextFace()
      if (!next) return res.sendStatus(500)
      currentFileIndex = next.index
      res.json(next)
    } catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  })

  app.post('/save', (req, res) => {
    if (!req.body.file || !['open', 'not-open', 'ambiguous'].includes(req.body.label))
      return res.sendStatus(500)

    console.log('Saving labels...')
    labels.push(req.body)
    currentFileIndex++
    saveLabels()
    res.sendStatus(204)
  })

  console.log('App listening on 9002...')
  app.listen(9002)
}

run()
