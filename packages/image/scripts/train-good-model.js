const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const lodash = require('lodash')
const tf = require('@tensorflow/tfjs-node')
const Bluebird = require('bluebird')

if (process.argv.length !== 3) {
  console.error('USAGE: train-good-model.js <input_dir>')
  console.error(process.argv)
  process.exit(1)
}

const IMAGE_WIDTH = 150
const IMAGE_HEIGHT = 150
const IMAGE_CHANNELS = 1
const IMAGE_SIZE = IMAGE_WIDTH * IMAGE_HEIGHT * IMAGE_CHANNELS
const LABEL_SIZE = 2

async function run() {
  const inputDir = process.argv[2]
  const labelsAsJson = require(path.join(inputDir, '0000-labels.json'))

  const PREPROCESSED_IMAGES_FILE = path.join(inputDir, '0000-images.uint8')
  const PREPROCESSED_LABELS_FILE = path.join(inputDir, '0000-labels.uint8')

  async function loadImages() {
    const goodFiles = new Set(labelsAsJson.filter(item => item.label === 'good').map(item => item.file))
    const badFiles = new Set(labelsAsJson.filter(item => item.label === 'bad').map(item => item.file))
    console.log(`${goodFiles.size} good, ${badFiles.size} not good`)

    if (fs.existsSync(PREPROCESSED_IMAGES_FILE)) {
      return {
        imagesBuffer: fs.readFileSync(PREPROCESSED_IMAGES_FILE),
        labelsBuffer: fs.readFileSync(PREPROCESSED_LABELS_FILE),
      }
    }

    const images = []
    const allFiles = lodash.shuffle([...goodFiles, ...badFiles]).slice(0, 2000)
    await Bluebird.map(allFiles, async (file, index) => {
      const filePath = path.join(inputDir, 'Auto-Generated', file)
      const rawImage = fs.readFileSync(filePath)
      const imageData = await sharp(rawImage).greyscale().raw().toBuffer({resolveWithObject: true})

      const labelBytes = [0, 0]
      if (goodFiles.has(file)) labelBytes[1] = 1
      else labelBytes[0] = 1

      images.push({file, imageBuffer: imageData.data, labelBuffer: Buffer.from(labelBytes)})
      console.log(`Done with ${file} (${allFiles.length - index} of ${allFiles.length})`)
    }, {concurrency: 4})

    const shuffled = lodash.shuffle(images)
    const imagesBuffer = Buffer.concat(shuffled.map(x => x.imageBuffer))
    const labelsBuffer = Buffer.concat(shuffled.map(x => x.labelBuffer))
    fs.writeFileSync(PREPROCESSED_IMAGES_FILE, imagesBuffer)
    fs.writeFileSync(PREPROCESSED_LABELS_FILE, labelsBuffer)

    return {imagesBuffer, labelsBuffer}
  }

  function getTensorModel() {
    const model = tf.sequential()
    model.add(tf.layers.conv2d({
      inputShape: [IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS],
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling'
    }));

    // The MaxPooling layer acts as a sort of downsampling using max values
    // in a region instead of averaging.
    model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));

    // Repeat another conv2d + maxPooling stack.
    // Note that we have more filters in the convolution.
    model.add(tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling'
    }));
    model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));

    // Now we flatten the output from the 2D filters into a 1D vector to prepare
    // it for input into our last layer. This is common practice when feeding
    // higher dimensional data to a final classification output layer.
    model.add(tf.layers.flatten());

    const NUM_OUTPUT_CLASSES = 2;
    model.add(tf.layers.dense({
      units: NUM_OUTPUT_CLASSES,
      kernelInitializer: 'varianceScaling',
      activation: 'softmax'
    }));

    // Choose an optimizer, loss function and accuracy metric,
    // then compile and return the model
    const optimizer = tf.train.adam();
    model.compile({
      optimizer: optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model
  }

  function getTensorDatasets(imagesBuffer, labelsBuffer) {
    const xs = new Float32Array(imagesBuffer.length)
    const xsCount = xs.length / IMAGE_SIZE
    const labelsCount = labelsBuffer.length / LABEL_SIZE
    if (xsCount !== labelsCount) throw new Error(`Mismatch in labels and xs`)

    for (let i = 0; i <imagesBuffer.length; i++) {
      xs[i] = imagesBuffer[i] / 255
    }

    return {
      n: xsCount,
      xs: tf.tensor2d(xs, [xsCount, IMAGE_SIZE]),
      labels: tf.tensor2d(new Uint8Array(labelsBuffer), [labelsCount, LABEL_SIZE])
    }
  }

  const model = getTensorModel()
  const {imagesBuffer, labelsBuffer} = await loadImages()
  const [dataX, dataY] = tf.tidy(() => {
    const {n, xs, labels} = getTensorDatasets(imagesBuffer, labelsBuffer)
    return [xs.reshape([n, IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS]), labels]
  })

  await model.fit(dataX, dataY, {
    batchSize: 100,
    epochs: 20,
    shuffle: true,
  })

  const MODEL_DIR = path.join(__dirname, '../data/models')
  await model.save(`file://${path.join(MODEL_DIR, 'photo-model')}`)
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
