const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const _ = require('lodash')
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
const NUMBER_OF_BATCHES = 50

async function run() {
  const inputDir = process.argv[2]
  const labelsAsJson = _.uniqBy(require(path.join(inputDir, '0000-labels.json')), 'file')
  const PREPROCESSED_IMAGES_FILE = path.join(inputDir, '0000-images.uint8')
  const PREPROCESSED_LABELS_FILE = path.join(inputDir, '0000-labels.uint8')
  const BATCH_SIZE = Math.ceil(labelsAsJson.length / NUMBER_OF_BATCHES)

  const fileDefinitions = labelsAsJson.map((item, idx) => ({...item, idx}))
  const goodFiles = new Set(labelsAsJson.filter(item => item.label === 'good').map(i => i.file))
  const badFiles = new Set(labelsAsJson.filter(item => item.label === 'bad').map(i => i.file))
  console.log(`${goodFiles.size} good, ${badFiles.size} not good`)

  function getFilePathForIndex(template, index) {
    const prefix = _.padStart(index.toString(), 4, '0')
    return template.replace(`0000`, prefix)
  }

  async function loadImages(index) {
    const bufferFilePath = getFilePathForIndex(PREPROCESSED_IMAGES_FILE, index)
    const labelsFilePath = getFilePathForIndex(PREPROCESSED_LABELS_FILE, index)

    if (fs.existsSync(bufferFilePath)) {
      return {
        imagesBuffer: fs.readFileSync(bufferFilePath),
        labelsBuffer: fs.readFileSync(labelsFilePath),
      }
    }

    const images = []
    const filesToUseForBatch = fileDefinitions
      .filter(item => item.idx % NUMBER_OF_BATCHES === index)
      .map(item => item.file)

    await Bluebird.map(filesToUseForBatch, async (file, index) => {
      try {
        const filePath = path.join(inputDir, 'Auto-Generated', file)
        const rawImage = fs.readFileSync(filePath)
        const imageData = await sharp(rawImage).greyscale().raw().toBuffer({resolveWithObject: true})

        const labelBytes = [0, 0]
        if (goodFiles.has(file)) labelBytes[1] = 1
        else labelBytes[0] = 1

        images.push({file, imageBuffer: imageData.data, labelBuffer: Buffer.from(labelBytes)})
        console.log(`Done with ${file} (${filesToUseForBatch.length - index} of ${filesToUseForBatch.length})`)
      } catch (err) {
        console.error(err)
      }
    }, {concurrency: 4})

    const shuffled = _.shuffle(images)
    const imagesBuffer = Buffer.concat(shuffled.map(x => x.imageBuffer))
    const labelsBuffer = Buffer.concat(shuffled.map(x => x.labelBuffer))
    fs.writeFileSync(bufferFilePath, imagesBuffer)
    fs.writeFileSync(labelsFilePath, labelsBuffer)

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

  async function prebuildAll() {
    for (let i = 0; i < NUMBER_OF_BATCHES; i++) {
      await loadImages(i)
    }
  }

  async function *xsGenerator() {
    for (let i = 0; i < NUMBER_OF_BATCHES; i++) {
      const {imagesBuffer, labelsBuffer} = await loadImages(i)
      const xs = new Float32Array(imagesBuffer.length)
      const xsCount = xs.length / IMAGE_SIZE
      const labelsCount = labelsBuffer.length / LABEL_SIZE
      if (xsCount !== labelsCount) throw new Error(`Mismatch in labels and xs`)

      for (let i = 0; i < imagesBuffer.length; i++) {
        xs[i] = imagesBuffer[i] / 255
      }

      for (let i = 0; i < xsCount; i++) {
        const xBuffer = xs.slice(i * IMAGE_SIZE, (i + 1) * IMAGE_SIZE)
        if (!xBuffer.length) console.log({i, xBuffer, IMAGE_SIZE, xsCount})
        yield tf
          .tensor1d(xBuffer)
          .reshape([IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS])
      }
    }
  }

  async function *labelsGenerator() {
    for (let i = 0; i < NUMBER_OF_BATCHES; i++) {
      const {labelsBuffer} = await loadImages(i)
      const labelsCount = labelsBuffer.length / LABEL_SIZE

      for (let i = 0; i < labelsCount; i++) {
        const data = new Uint8Array([labelsBuffer[i * LABEL_SIZE], labelsBuffer[i * LABEL_SIZE + 1]])
        yield tf.tensor1d(data)
      }
    }
  }

  console.log('Prebuilding labels...')
  await prebuildAll()
  const model = getTensorModel()
  const xs = tf.data.generator(xsGenerator)
  const labels = tf.data.generator(labelsGenerator)
  const dataStream = tf.data.zip({xs, ys: labels}).shuffle(BATCH_SIZE).batch(100)

  await model.fitDataset(dataStream, {
    epochs: 15,
  })

  const MODEL_DIR = path.join(__dirname, '../data/models')
  await model.save(`file://${path.join(MODEL_DIR, 'photo-model')}`)
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
