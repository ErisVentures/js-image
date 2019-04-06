import * as tf from '@tensorflow/tfjs-node'
import * as path from 'path'

import * as faceapi from 'face-api.js'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {IFaceAnalysisEntry, IBoundingBox} from '../types'

const FACE_CONFIDENCE_THRESHOLD = 0.75

let initialized = false

async function initializeIfNecessary(): Promise<void> {
  if (initialized) return

  const modelPath = path.join(__dirname, '../../data/models')

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
  await faceapi.nets.faceExpressionNet.loadFromDisk(modelPath)

  initialized = true
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

export async function detectFaces(imageData: IAnnotatedImageData): Promise<IFaceAnalysisEntry[]> {
  await initializeIfNecessary()

  const pixels = new Uint8Array(ImageData.toRGB(imageData).data)
  const imageTensor = tf.tensor3d(pixels, [
    imageData.height,
    imageData.width,
    3,
  ])

  const detectionOptions = new faceapi.SsdMobilenetv1Options({
    minConfidence: FACE_CONFIDENCE_THRESHOLD,
  })

  const results = await faceapi
    .detectAllFaces(imageTensor as any, detectionOptions)
    .withFaceExpressions()
    .withFaceLandmarks()

  return results.map(({detection, landmarks, expressions}) => {
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
}
