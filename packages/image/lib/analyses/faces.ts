monkeyPatchConsoleWarn()
import * as tf from '@tensorflow/tfjs-node'
import * as path from 'path'

import * as faceapi from 'face-api.js'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {IFaceAnalysisEntry, IBoundingBox, IFaceAnalysisEyeEntry} from '../types'
import {subselect} from '../transforms/subselect'
import {SharpImage} from '../sharp-image'

const FACE_CONFIDENCE_THRESHOLD = 0.75

let eyeModel: tf.LayersModel | undefined

async function initializeIfNecessary(): Promise<void> {
  if (eyeModel) return

  const modelDir = path.join(__dirname, '../../data/models')

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
  await faceapi.nets.faceExpressionNet.loadFromDisk(modelDir)

  const eyeModelPath = path.join(modelDir, 'eye-model/model.json')
  eyeModel = await tf.loadLayersModel(`file://${eyeModelPath}`)
}

function roundBoundingBox(box: IBoundingBox): IBoundingBox {
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  }
}

function getEyeBoxFromPointArray(points: faceapi.Point[], faceBox: IBoundingBox): IBoundingBox {
  if (!points.length) return {x: NaN, y: NaN, width: NaN, height: NaN}

  let xMin = Infinity
  let yMin = Infinity
  let xMax = 0
  let yMax = 0
  let xAvg = 0
  let yAvg = 0

  for (const point of points) {
    xMin = Math.min(point.x, xMin)
    yMin = Math.min(point.y, yMin)
    xMax = Math.max(point.x, xMax)
    yMax = Math.max(point.y, yMax)
    xAvg += point.x / points.length
    yAvg += point.y / points.length
  }

  // Make sure the eye bounding box is big enough in proportion to the face
  const radius = faceBox.width / 8
  xMin = Math.min(xAvg - radius)
  xMax = Math.max(xAvg + radius)
  yMin = Math.min(yAvg - radius * 0.75)
  yMax = Math.max(yAvg + radius * 0.75)

  return roundBoundingBox({
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin,
  })
}

/**
 * Tensorflow spams console.warn unnecessarily, so we'll patch console.warn to ignore messages from them.
 */
function monkeyPatchConsoleWarn(): void {
  const globalUnsafe = global as any
  if (globalUnsafe.__console_warn__) return

  process.env.TF_CPP_MIN_LOG_LEVEL = '2'

  /* tslint:disable no-console */
  const consoleWarn = console.warn
  console.warn = (...args: any[]) => {
    const stack = new Error().stack || ''
    if (stack.includes('tensorflow')) return
    consoleWarn(...args)
  }

  globalUnsafe.__console_warn__ = consoleWarn
}

async function runEyeOpenModel(
  eye: IFaceAnalysisEyeEntry,
  allImageData: IAnnotatedImageData,
): Promise<void> {
  const eyeImageData = subselect(allImageData, {
    top: eye.y,
    left: eye.x,
    right: eye.x + eye.width,
    bottom: eye.y + eye.height,
  })

  const normalizedImageData = await SharpImage.from(eyeImageData)
    .greyscale()
    .normalize()
    .resize(30, 30, {fit: 'fill'})
    .raw()
    .toBuffer({resolveWithObject: true})

  const tensorInputArray = new Float32Array(normalizedImageData.data.length)
  for (let i = 0; i < normalizedImageData.data.length; i++) {
    tensorInputArray[i] = normalizedImageData.data[i] / 255
  }

  const imageTensor = tf.tensor4d(tensorInputArray, [1, 30, 30, 1])
  const prediction = eyeModel!.predict(imageTensor) as tf.Tensor
  const data = await prediction.data()
  eye.openConfidence = data[1]
}

export async function detectFaces(imageData: IAnnotatedImageData): Promise<IFaceAnalysisEntry[]> {
  await initializeIfNecessary()

  const pixels = new Uint8Array(ImageData.toRGB(imageData).data)
  const imageTensor = tf.tensor3d(pixels, [imageData.height, imageData.width, 3])

  const detectionOptions = new faceapi.SsdMobilenetv1Options({
    minConfidence: FACE_CONFIDENCE_THRESHOLD,
  })

  const results = await faceapi
    .detectAllFaces(imageTensor as any, detectionOptions)
    .withFaceExpressions()
    .withFaceLandmarks()

  const faces = results.map(({detection, landmarks, expressions}) => {
    const faceBox = roundBoundingBox(detection.box)
    const happyExpression = expressions.find(item => item.expression === 'happy')

    return {
      confidence: detection.score,
      happinessConfidence: (happyExpression && happyExpression.probability) || 0,
      boundingBox: faceBox,
      eyes: [
        getEyeBoxFromPointArray(landmarks.getLeftEye(), faceBox),
        getEyeBoxFromPointArray(landmarks.getRightEye(), faceBox),
      ].filter(box => Number.isFinite(box.x)),
    }
  })

  for (const face of faces) {
    for (const eye of face.eyes) {
      await runEyeOpenModel(eye, imageData)
    }
  }

  return faces
}
