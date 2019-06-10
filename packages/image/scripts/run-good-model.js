const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const sharp = require('sharp')
const tf = require('@tensorflow/tfjs-node')

const TMP_PHOTOS_PATH = path.join(__dirname, '../dist/tmp-photos')

if (process.argv.length !== 3) {
  console.error('USAGE: run-good-model.js <image>')
  console.error(process.argv)
  process.exit(1)
}

async function runModelOnImage(imagePath, model) {
  const rawImage = fs.readFileSync(imagePath)
  const imageData = await sharp(rawImage)
    .greyscale()
    .resize(150, 150, {fit: 'fill'})
    .raw()
    .toBuffer({resolveWithObject: true})
  const tensorInputArray = new Float32Array(imageData.data.length)
  for (let i = 0; i < imageData.data.length; i++) {
    tensorInputArray[i] = imageData.data[i] / 255
  }

  const imageTensor = tf.tensor4d(tensorInputArray, [1, 150, 150, 1])

  const data = await model.predict(imageTensor).data()
  return data[1]
}

async function run() {
  const inputPath = path.resolve(process.cwd(), process.argv[2])
  const model = await tf.loadLayersModel(
    `file://${path.join(__dirname, '../data/models/photo-model/model.json')}`,
  )


  if (fs.statSync(inputPath).isDirectory()) {
    const allFileConfidence = []
    for (const file of fs.readdirSync(inputPath)) {
      const filePath = path.resolve(inputPath, file)
      const confidence = await runModelOnImage(filePath, model)
      allFileConfidence.push({filePath, confidence})
    }

    const sorted = _.sortBy(allFileConfidence, 'confidence').reverse()

    if (fs.existsSync(TMP_PHOTOS_PATH)) fs.removeSync(TMP_PHOTOS_PATH)
    else fs.mkdirpSync(TMP_PHOTOS_PATH)

    let i = 0
    for (const {filePath, confidence} of sorted) {
      const idx = i.toString()
      const fileSuffix = _.padStart(idx, 4, '0')
      const file = `IMG_${fileSuffix}.jpg`
      console.log(`${path.basename(filePath)} confidence was ${confidence} (${file})`)
      fs.copyFileSync(filePath, path.join(TMP_PHOTOS_PATH, file))
      i++
    }
  } else {
    console.log('Confidence is', await runModelOnImage(inputPath, model))
  }
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
