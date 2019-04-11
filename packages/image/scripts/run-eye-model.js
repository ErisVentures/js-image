const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const tf = require('@tensorflow/tfjs-node')

if (process.argv.length !== 3) {
  console.error('USAGE: run-eye-model.js <eye_image>')
  console.error(process.argv)
  process.exit(1)
}

async function run() {
  const input = process.argv[2]
  const rawImage = fs.readFileSync(path.resolve(process.cwd(), input))
  const imageData = await sharp(rawImage)
    .greyscale()
    .normalize()
    .raw()
    .toBuffer({resolveWithObject: true})
  const tensorInputArray = new Float32Array(imageData.data.length)
  for (let i = 0; i < imageData.data.length; i++) {
    tensorInputArray[i] = imageData.data[i] / 255
  }

  const imageTensor = tf.tensor4d(tensorInputArray, [1, 30, 30, 1])

  const model = await tf.loadLayersModel(
    `file://${path.join(__dirname, '../data/models/eye-model/model.json')}`,
  )
  model.predict(imageTensor).print()
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
