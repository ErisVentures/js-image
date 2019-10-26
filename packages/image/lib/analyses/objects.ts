monkeyPatchConsoleWarn()
import * as tf from '@tensorflow/tfjs-node'
import * as tfconv from '@tensorflow/tfjs-converter'
import * as path from 'path'
import * as _ from 'lodash'

import {IAnnotatedImageData} from '../image-data'
import {IObjectAnalysisEntry, IObjectAnalysisOptions} from '../types'
import {SharpImage} from '../sharp-image'
import {instrumentation} from '../instrumentation'

let ssdModel: ObjectDetection | undefined

async function initializeIfNecessary_(): Promise<void> {
  if (ssdModel) return

  const modelDir = path.join(__dirname, '../../data/models/coco-ssd')

  const ssdModelPath = path.join(modelDir, 'model.json')
  ssdModel = await load(`file://${ssdModelPath}`)
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

async function runCocoSsdModel(
  imageData: IAnnotatedImageData,
  options: IObjectAnalysisOptions = {},
): Promise<IObjectAnalysisEntry[]> {
  const {size = 300} = options
  const normalizedImageData = await SharpImage.from(imageData)
    .resize(size, size, {fit: 'fill'})
    .normalize()
    .raw()
    .toBuffer({resolveWithObject: true})

  const tensorInputArray = new Int32Array(normalizedImageData.data.length)
  for (let i = 0; i < normalizedImageData.data.length; i++) {
    tensorInputArray[i] = normalizedImageData.data[i]
  }

  const imageTensor = tf.tensor3d(tensorInputArray, [size, size, 3])
  const predictions = await ssdModel!.detect(imageTensor)

  return predictions.map(prediction => {
    return {
      object: prediction.class,
      confidence: prediction.score,
      boundingBox: {
        x: prediction.bbox[0] / size,
        y: prediction.bbox[1] / size,
        width: prediction.bbox[2] / size,
        height: prediction.bbox[3] / size,
      },
    }
  })
}

const initializeIfNecessary = instrumentation.wrapMethod(
  'objects.initializeIfNecessary',
  initializeIfNecessary_,
)

export async function detectObjects(
  imageData: IAnnotatedImageData,
  options?: IObjectAnalysisOptions,
): Promise<IObjectAnalysisEntry[]> {
  await initializeIfNecessary()
  return runCocoSsdModel(imageData, options)
}

/*
==========================================================================
==========================================================================
======= START OF MODIFIED CODE FROM @tensorflow-models/coco-ssd ==========
======= https://github.com/tensorflow/tfjs-models/blob/471429d91ef9857e2d1b3825c74eaece1b6f4f39/coco-ssd/src/index.ts
==========================================================================
==========================================================================
*/

/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

interface ObjectDetectionClass {
  id: number
  displayName: string
}

const CLASSES: ObjectDetectionClass[] = [
  {id: 0, displayName: 'unknown'},
  {id: 1, displayName: 'person'},
  {id: 2, displayName: 'bicycle'},
  {id: 3, displayName: 'car'},
  {id: 4, displayName: 'motorcycle'},
  {id: 5, displayName: 'airplane'},
  {id: 6, displayName: 'bus'},
  {id: 7, displayName: 'train'},
  {id: 8, displayName: 'truck'},
  {id: 9, displayName: 'boat'},
  {id: 10, displayName: 'traffic light'},
  {id: 11, displayName: 'fire hydrant'},
  {id: 12, displayName: 'unknown'},
  {id: 13, displayName: 'stop sign'},
  {id: 14, displayName: 'parking meter'},
  {id: 15, displayName: 'bench'},
  {id: 16, displayName: 'bird'},
  {id: 17, displayName: 'cat'},
  {id: 18, displayName: 'dog'},
  {id: 19, displayName: 'horse'},
  {id: 20, displayName: 'sheep'},
  {id: 21, displayName: 'cow'},
  {id: 22, displayName: 'elephant'},
  {id: 23, displayName: 'bear'},
  {id: 24, displayName: 'zebra'},
  {id: 25, displayName: 'giraffe'},
  {id: 26, displayName: 'unknown'},
  {id: 27, displayName: 'backpack'},
  {id: 28, displayName: 'umbrella'},
  {id: 29, displayName: 'unknown'},
  {id: 30, displayName: 'unknown'},
  {id: 31, displayName: 'handbag'},
  {id: 32, displayName: 'tie'},
  {id: 33, displayName: 'suitcase'},
  {id: 34, displayName: 'frisbee'},
  {id: 35, displayName: 'skis'},
  {id: 36, displayName: 'snowboard'},
  {id: 37, displayName: 'sports ball'},
  {id: 38, displayName: 'kite'},
  {id: 39, displayName: 'baseball bat'},
  {id: 40, displayName: 'baseball glove'},
  {id: 41, displayName: 'skateboard'},
  {id: 42, displayName: 'surfboard'},
  {id: 43, displayName: 'tennis racket'},
  {id: 44, displayName: 'bottle'},
  {id: 45, displayName: 'unknown'},
  {id: 46, displayName: 'wine glass'},
  {id: 47, displayName: 'cup'},
  {id: 48, displayName: 'fork'},
  {id: 49, displayName: 'knife'},
  {id: 50, displayName: 'spoon'},
  {id: 51, displayName: 'bowl'},
  {id: 52, displayName: 'banana'},
  {id: 53, displayName: 'apple'},
  {id: 54, displayName: 'sandwich'},
  {id: 55, displayName: 'orange'},
  {id: 56, displayName: 'broccoli'},
  {id: 57, displayName: 'carrot'},
  {id: 58, displayName: 'hot dog'},
  {id: 59, displayName: 'pizza'},
  {id: 60, displayName: 'donut'},
  {id: 61, displayName: 'cake'},
  {id: 62, displayName: 'chair'},
  {id: 63, displayName: 'couch'},
  {id: 64, displayName: 'potted plant'},
  {id: 65, displayName: 'bed'},
  {id: 66, displayName: 'unknown'},
  {id: 67, displayName: 'dining table'},
  {id: 68, displayName: 'unknown'},
  {id: 69, displayName: 'unknown'},
  {id: 70, displayName: 'toilet'},
  {id: 71, displayName: 'unknown'},
  {id: 72, displayName: 'tv'},
  {id: 73, displayName: 'laptop'},
  {id: 74, displayName: 'mouse'},
  {id: 75, displayName: 'remote'},
  {id: 76, displayName: 'keyboard'},
  {id: 77, displayName: 'cell phone'},
  {id: 78, displayName: 'microwave'},
  {id: 79, displayName: 'oven'},
  {id: 80, displayName: 'toaster'},
  {id: 81, displayName: 'sink'},
  {id: 82, displayName: 'refrigerator'},
  {id: 83, displayName: 'unknown'},
  {id: 84, displayName: 'book'},
  {id: 85, displayName: 'clock'},
  {id: 86, displayName: 'vase'},
  {id: 87, displayName: 'scissors'},
  {id: 88, displayName: 'teddy bear'},
  {id: 89, displayName: 'hair drier'},
  {id: 90, displayName: 'toothbrush'},
]

/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

export interface DetectedObject {
  bbox: [number, number, number, number] // [x, y, width, height]
  class: string
  score: number
}

async function load(modelUrl: string): Promise<ObjectDetection> {
  const objectDetection = new ObjectDetection(modelUrl)
  await objectDetection.load()
  return objectDetection
}

class ObjectDetection {
  private readonly modelPath: string
  private model: tfconv.GraphModel

  public constructor(modelUrl: string) {
    this.modelPath = modelUrl
  }

  public async load(): Promise<void> {
    this.model = await tfconv.loadGraphModel(this.modelPath)

    // Warmup the model.
    const result = (await this.model.executeAsync(tf.zeros([1, 300, 300, 3]))) as tf.Tensor[]
    await Promise.all(result.map(t => t.data()))
    result.map(t => t.dispose())
  }

  /**
   * Infers through the model.
   *
   * @param img The image to classify. Can be a tensor or a DOM element image,
   * video, or canvas.
   * @param maxNumBoxes The maximum number of bounding boxes of detected
   * objects. There can be multiple objects of the same class, but at different
   * locations. Defaults to 20.
   */
  private async infer(
    img: tf.Tensor3D | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    maxNumBoxes: number,
  ): Promise<DetectedObject[]> {
    const batched = tf.tidy(() => {
      if (!(img instanceof tf.Tensor)) {
        img = tf.browser.fromPixels(img)
      }
      // Reshape to a single-element batch so we can pass it to executeAsync.
      return img.expandDims(0)
    })
    const height = batched.shape[1]!
    const width = batched.shape[2]!

    // model returns two tensors:
    // 1. box classification score with shape of [1, 1917, 90]
    // 2. box location with shape of [1, 1917, 1, 4]
    // where 1917 is the number of box detectors, 90 is the number of classes.
    // and 4 is the four coordinates of the box.
    const result = (await this.model.executeAsync(batched)) as tf.Tensor[]

    const scores = result[0].dataSync() as Float32Array
    const boxes = result[1].dataSync() as Float32Array

    // clean the webgl tensors
    batched.dispose()
    tf.dispose(result)

    const [maxScores, classes] = this.calculateMaxScores(
      scores,
      result[0].shape[1]!,
      result[0].shape[2]!,
    )

    const prevBackend = tf.getBackend()
    // run post process in cpu
    tf.setBackend('cpu')
    const indexTensor = tf.tidy(() => {
      const boxes2 = tf.tensor2d(new Float32Array(boxes), [
        result[1].shape[1]!,
        result[1].shape[3]!,
      ])
      return tf.image.nonMaxSuppression(boxes2, maxScores, maxNumBoxes, 0.5, 0.5)
    })

    const indexes = indexTensor.dataSync() as Float32Array
    indexTensor.dispose()

    // restore previous backend
    tf.setBackend(prevBackend)

    return this.buildDetectedObjects(width, height, boxes, maxScores, indexes, classes)
  }

  private buildDetectedObjects(
    width: number,
    height: number,
    boxes: Float32Array,
    scores: number[],
    indexes: Float32Array,
    classes: number[],
  ): DetectedObject[] {
    const count = indexes.length
    const objects: DetectedObject[] = []
    for (let i = 0; i < count; i++) {
      const bbox = []
      for (let j = 0; j < 4; j++) {
        bbox[j] = boxes[indexes[i] * 4 + j]
      }
      const minY = bbox[0] * height
      const minX = bbox[1] * width
      const maxY = bbox[2] * height
      const maxX = bbox[3] * width
      bbox[0] = minX
      bbox[1] = minY
      bbox[2] = maxX - minX
      bbox[3] = maxY - minY
      const classIndex = classes[indexes[i]] + 1

      objects.push({
        bbox: bbox as [number, number, number, number],
        class: (CLASSES[classIndex] && CLASSES[classIndex].displayName) || 'unknown',
        score: scores[indexes[i]],
      })
    }
    return objects
  }

  private calculateMaxScores(
    scores: Float32Array,
    numBoxes: number,
    numClasses: number,
  ): [number[], number[]] {
    const maxes = []
    const classes = []
    for (let i = 0; i < numBoxes; i++) {
      let max = Number.MIN_VALUE
      let index = -1
      for (let j = 0; j < numClasses; j++) {
        if (scores[i * numClasses + j] > max) {
          max = scores[i * numClasses + j]
          index = j
        }
      }
      maxes[i] = max
      classes[i] = index
    }
    return [maxes, classes]
  }

  /**
   * Detect objects for an image returning a list of bounding boxes with
   * assocated class and score.
   *
   * @param img The image to detect objects from. Can be a tensor or a DOM
   *     element image, video, or canvas.
   * @param maxNumBoxes The maximum number of bounding boxes of detected
   * objects. There can be multiple objects of the same class, but at different
   * locations. Defaults to 20.
   *
   */
  public async detect(
    img: tf.Tensor3D | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    maxNumBoxes: number = 20,
  ): Promise<DetectedObject[]> {
    return this.infer(img, maxNumBoxes)
  }

  /**
   * Dispose the tensors allocated by the model. You should call this when you
   * are done with the model.
   */
  public dispose(): void {
    if (this.model) {
      this.model.dispose()
    }
  }
}
