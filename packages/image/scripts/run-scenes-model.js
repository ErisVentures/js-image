const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const tf = require('@tensorflow/tfjs-node')

const SCENES_MODEL_DIR = path.join(__dirname, '../data/models/scenes-model')
const SCENES_TXT = path.join(SCENES_MODEL_DIR, 'scenes.txt')

if (process.argv.length !== 3) {
  console.error('USAGE: run-scenes-model.js <image>')
  console.error(process.argv)
  process.exit(1)
}

async function run() {
  const input = process.argv[2]
  const rawImage = fs.readFileSync(path.resolve(process.cwd(), input))
  const imageData = await sharp(rawImage)
    .resize(224, 224, {fit: 'fill'})
    .normalize()
    .raw()
    .toBuffer({resolveWithObject: true})
  const tensorInputArray = new Float32Array(imageData.data.length)

  for (let i = 0; i < imageData.data.length; i++) {
    tensorInputArray[i] = imageData.data[i]
  }

  const imageTensor = tf.tensor4d(tensorInputArray, [1, 224, 224, 3])

  const model = await tf.loadGraphModel(
    `file://${path.join(SCENES_MODEL_DIR, 'model.json')}`,
  )
  const data = await model.predict(imageTensor).data()
  const lines = fs.readFileSync(SCENES_TXT, 'utf8')
    .split('\n')
    .filter(Boolean)
  const results = [...data]
    .map((probability, idx) => [probability, lines[idx]])
    .sort((a, b) => b[0] - a[0])
    .slice(0, 10)
  console.log(results)
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
