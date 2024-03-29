monkeyPatchConsoleWarn()
import * as tf from '@tensorflow/tfjs-node'
import * as path from 'path'
import * as _ from 'lodash'

import * as faceapi from '@vladmandic/face-api'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {
  IFaceAnalysisEntry,
  IBoundingBox,
  IFaceAnalysisEyeEntry,
  IFaceAnalysisOptions,
} from '../types'
import {subselect} from '../transforms/subselect'
import {SharpImage} from '../sharp-image'
import {instrumentation} from '../instrumentation'

const FACE_CONFIDENCE_THRESHOLD = 0.4

let eyeModel: tf.LayersModel | undefined

async function initializeIfNecessary_(): Promise<void> {
  if (eyeModel) return

  const modelDir = path.join(__dirname, '../../data/models')

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
  await faceapi.nets.faceExpressionNet.loadFromDisk(modelDir)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir)

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

function convertToPercentageCoordinates(
  box: IBoundingBox,
  width: number,
  height: number,
): IBoundingBox {
  return {
    x: box.x / width,
    y: box.y / height,
    width: box.width / width,
    height: box.height / height,
  }
}
function convertPointToPercentageCoordinates(
  point: Pick<IBoundingBox, 'x' | 'y'>,
  width: number,
  height: number,
): Pick<IBoundingBox, 'x' | 'y'> {
  return {
    x: point.x / width,
    y: point.y / height,
  }
}

function getBoxFromPointArray(
  points: faceapi.Point[],
  minWidth: number,
  minHeight: number,
): IBoundingBox {
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

  // Make sure the bounding box is big enough in proportion to the face
  const widthRadius = minWidth / 2
  const heightRadius = minHeight / 2
  xMin = Math.min(xAvg - widthRadius, xMin)
  xMax = Math.max(xAvg + widthRadius, xMax)
  yMin = Math.min(yAvg - heightRadius, yMin)
  yMax = Math.max(yAvg + heightRadius, yMax)

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

const initializeIfNecessary = instrumentation.wrapMethod(
  'faces.initializeIfNecessary',
  initializeIfNecessary_,
)

function convertFaceDescriptor(descriptor: Float32Array): number[] {
  const output: number[] = []
  for (let i = 0; i < descriptor.length; i++) {
    // The complete range is ~[-0.5, 0.5] but in practice nearly all values are in ~[-0.3, 0.3]
    // We'll remap [-0.4, 0.4] to [0, 256] and live with the clipping in exchange for greater resolution at the center
    output[i] = ImageData.clip255(descriptor[i] * 320 + 128)
  }
  return output
}

async function detectFaces_(
  imageData: IAnnotatedImageData,
  options?: IFaceAnalysisOptions,
): Promise<IFaceAnalysisEntry[]> {
  const {threshold = FACE_CONFIDENCE_THRESHOLD} = options || {}
  await initializeIfNecessary()

  const pixels = new Uint8Array(ImageData.toRGB(imageData).data)
  const imageTensor = tf.tensor3d(pixels, [imageData.height, imageData.width, 3])

  const detectionOptions = new faceapi.SsdMobilenetv1Options({
    minConfidence: threshold,
  })

  const results = await faceapi
    .detectAllFaces(imageTensor as any, detectionOptions)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors()

  const mapPoint = (p: faceapi.Point) =>
    convertPointToPercentageCoordinates(p, imageData.width, imageData.height)
  const faces = results.map(({detection, landmarks, expressions, descriptor}) => {
    const faceBox = roundBoundingBox(detection.box)
    const happyExpression = expressions.happy
    const maxExpression = _.maxBy(expressions.asSortedArray(), x => x.probability)

    const minEyeWidth = faceBox.width / 4
    const minEyeHeight = (minEyeWidth * 3) / 4

    return {
      confidence: detection.score,
      expression:
        (maxExpression && (maxExpression.expression as IFaceAnalysisEntry['expression'])) ||
        'neutral',
      expressionConfidence: (maxExpression && maxExpression.probability) || 0,
      happinessConfidence: happyExpression || 0,
      boundingBox: convertToPercentageCoordinates(faceBox, imageData.width, imageData.height),
      descriptor: descriptor ? convertFaceDescriptor(descriptor) : undefined,
      eyes: [
        getBoxFromPointArray(landmarks.getLeftEye(), minEyeWidth, minEyeHeight),
        getBoxFromPointArray(landmarks.getRightEye(), minEyeWidth, minEyeHeight),
      ].filter(box => Number.isFinite(box.x)),
      mouth: convertToPercentageCoordinates(
        getBoxFromPointArray(landmarks.getMouth(), 0, 0),
        imageData.width,
        imageData.height,
      ),
      nose: {points: landmarks.getNose().map(mapPoint)},
      jaw: {points: landmarks.getJawOutline().map(mapPoint)},
    }
  })

  for (const face of faces) {
    for (const eye of face.eyes || []) {
      if (eye.width >= 5 && eye.height >= 5) await runEyeOpenModel(eye, imageData)
      Object.assign(eye, convertToPercentageCoordinates(eye, imageData.width, imageData.height))
    }
  }

  return faces.sort((a, b) => b.boundingBox.height - a.boundingBox.height)
}

export const detectFaces = instrumentation.wrapMethod('detectFaces', detectFaces_)
