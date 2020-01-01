import {IAnnotatedImageData, ImageData} from '../image-data'
import {SharpImage} from '../sharp-image'
import {Colorspace, IBlockifyOptions, IBlock} from '../types'

function incrementalAverageColor(
  averageColor: [number, number, number],
  newColor: [number, number, number],
  n: number,
): [number, number, number] {
  const [rA, gA, bA] = averageColor
  const [r, g, b] = newColor
  return [(rA * n + r) / (n + 1), (gA * n + g) / (n + 1), (bA * n + b) / (n + 1)]
}

function isCloseEnough(
  averageColor: [number, number, number],
  newColor: [number, number, number],
  threshold: number,
): boolean {
  const [rA, gA, bA] = averageColor
  const [r, g, b] = newColor
  const distance = Math.pow(rA - r, 2) + Math.pow(gA - g, 2) + Math.pow(bA - b, 2)
  return Math.sqrt(distance) < threshold
}

function processBlockStartingAt(
  imageData: IAnnotatedImageData,
  processedBitMask: Uint8Array,
  xStart: number,
  yStart: number,
  threshold: number,
): IBlock | undefined {
  if (processedBitMask[xStart + imageData.width * yStart]) return

  let blockCount = 0
  let currentColor = ImageData.pixelFor(imageData, xStart, yStart).values as [
    number,
    number,
    number,
  ]
  const matchedIndexes = [] as Array<[number, number]>
  const indexQueue = [[xStart, yStart]] as Array<[number, number]>

  while (indexQueue.length) {
    const [x, y] = indexQueue.pop()!
    if (processedBitMask[x + imageData.width * y]) continue

    const index = ImageData.indexFor(imageData, x, y)
    const color = [imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]] as [
      number,
      number,
      number,
    ]

    if (isCloseEnough(currentColor, color, threshold)) {
      processedBitMask[x + imageData.width * y] = 1
      currentColor = incrementalAverageColor(currentColor, color, blockCount)
      blockCount++

      matchedIndexes.push([x, y])
      indexQueue.push(
        [ImageData.clipX(x - 1, imageData), y],
        [ImageData.clipX(x + 1, imageData), y],
        [x, ImageData.clipY(y - 1, imageData)],
        [x, ImageData.clipY(y + 1, imageData)],
      )
    }
  }

  let maxX = -Infinity
  let minX = Infinity
  let maxY = -Infinity
  let minY = Infinity

  currentColor = currentColor.map(x => Math.round(x)) as [number, number, number]

  for (const [x, y] of matchedIndexes) {
    maxX = Math.max(x, maxX)
    maxY = Math.max(y, maxY)
    minX = Math.min(x, minX)
    minY = Math.min(y, minY)

    const index = ImageData.indexFor(imageData, x, y)
    imageData.data[index] = currentColor[0]
    imageData.data[index + 1] = currentColor[1]!
    imageData.data[index + 2] = currentColor[2]!
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    count: matchedIndexes.length,
    r: currentColor[0],
    g: currentColor[1],
    b: currentColor[2],
  }
}

export async function blockify(
  imageData: IAnnotatedImageData,
  options: IBlockifyOptions = {},
): Promise<{imageData: IAnnotatedImageData, blocks: IBlock[]}> {
  const {blurRadius: blurRadiusRaw = 'auto', threshold = 20} = options
  const blurRadius =
    blurRadiusRaw === 'auto' ? Math.min(imageData.width, imageData.height) / 20 : blurRadiusRaw
  const blurred =
    blurRadius === 0
      ? ImageData.toRGB(imageData)
      : await SharpImage.toImageData(
          SharpImage.from(imageData)
            .normalize()
            .blur(blurRadius / 2 + 1)
            .resize(400, 400, {fit: 'inside'}),
        )

  const output = {...blurred, data: new Uint8Array(blurred.data)}
  ImageData.assert(output, [Colorspace.RGB])
  const processedBitMask = new Uint8Array(output.width * output.height)

  const blocks: IBlock[] = []

  for (let y = 0; y < output.height; y++) {
    for (let x = 0; x < output.width; x++) {
      const block = processBlockStartingAt(output, processedBitMask, x, y, threshold)
      if (block) blocks.push(block)
    }
  }

  return {imageData: output, blocks}
}
