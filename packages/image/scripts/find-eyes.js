const fs = require('fs')
const path = require('path')
const lodash = require('lodash')
const childProcess = require('child_process')
const Bluebird = require('bluebird')
const {BrowserImage} = require('../dist/browser-image')
const {Image, ImageFormat, ImageResizeFit} = require('../dist/node-index')

if (process.argv.length < 5) {
  console.error('USAGE: find-eyes.js <master|worker> <input_dir> <output_dir>')
  console.error(process.argv)
  process.exit(1)
}

async function runInWorker(inputPath, outputPath) {
  return new Promise(resolve => {
    let stderr = ''
    const child = childProcess.spawn(process.argv[0], [__filename, 'worker', inputPath, outputPath])
    child.stderr.on('data', data => (stderr += data.toString()))
    child.on('exit', () => resolve(stderr))
  })
}

async function run() {
  const role = process.argv[2]
  const input = process.argv[3]
  const output = process.argv[4]

  if (role === 'master') {
    const files = fs.readdirSync(input)

    await Bluebird.map(
      files,
      async file => {
        if (!file.endsWith('.jpg')) return

        const inputPath = path.join(input, file)
        const outputPath = path.join(output, file.replace('.jpg', '-face'))
        if (fs.existsSync(`${outputPath}-0.jpg`) || fs.existsSync(`${outputPath}-finished.json`)) {
          console.log(`${file} already done.`)
          return
        }

        console.log(`Running ${file}...`)
        const stderr = await runInWorker(inputPath, outputPath)
        if (stderr) console.error(stderr)
        console.log(`Finished ${file}!`)
      },
      {concurrency: require('os').cpus().length},
    )
  } else if (role === 'worker') {
    const image = Image.from(fs.readFileSync(input))
    const imageData = await image.toImageData()
    const analysis = await image.analyze({faces: {}}).toAnalysis()

    let faceIndex = 0
    for (const face of analysis.faces) {
      if (face.eyes.length === 0) continue
      if (face.boundingBox.height < 50) continue

      const faceImageData = await BrowserImage.from(imageData)
        .resize({
          fit: ImageResizeFit.Exact,
          width: face.boundingBox.width,
          height: face.boundingBox.height,
          subselect: {
            top: face.boundingBox.y,
            left: face.boundingBox.x,
            right: face.boundingBox.x + face.boundingBox.width,
            bottom: face.boundingBox.y + face.boundingBox.height,
          },
        })
        .toImageData()

      const resizedFace = await Image.from(faceImageData)
        .format(ImageFormat.JPEG)
        .resize({
          width: 100,
          height: 100,
          fit: ImageResizeFit.Contain,
        })
        .toBuffer()

      fs.writeFileSync(`${output}-${faceIndex}.jpg`, resizedFace)

      let eyeIndex = 0
      for (const eye of face.eyes) {
        const eyeImageData = await BrowserImage.from(imageData)
          .resize({
            fit: ImageResizeFit.Exact,
            width: eye.width,
            height: eye.height,
            subselect: {
              top: eye.y,
              left: eye.x,
              right: eye.x + eye.width,
              bottom: eye.y + eye.height,
            },
          })
          .toImageData()

        const resizedEye = await Image.from(eyeImageData)
          .format(ImageFormat.JPEG)
          .resize({
            width: 30,
            height: 30,
            fit: ImageResizeFit.Exact,
          })
          .toBuffer()

        fs.writeFileSync(`${output}-${faceIndex}-${eyeIndex}.jpg`, resizedEye)
        eyeIndex++
      }

      fs.writeFileSync(`${output}-${faceIndex}.json`, JSON.stringify(face, null, 2))
      faceIndex++
    }

    fs.writeFileSync(`${output}-finished.json`, JSON.stringify(analysis.faces, null, 2))
  } else {
    console.error('Invalid role', role)
    process.exit(1)
  }
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
