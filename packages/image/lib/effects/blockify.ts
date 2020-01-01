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

function colorDistance(colorA: [number, number, number], colorB: [number, number, number]): number {
  const [rA, gA, bA] = colorA
  const [r, g, b] = colorB
  return Math.sqrt(Math.pow(rA - r, 2) + Math.pow(gA - g, 2) + Math.pow(bA - b, 2))
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

    if (colorDistance(currentColor, color) <= threshold) {
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

function doBlockBoxesOverlap(blockA: IBlock, blockB: IBlock): boolean {
  const leftBlock = blockA.x <= blockB.x ? blockA : blockB
  const rightBlock = leftBlock === blockA ? blockB : blockA
  const topBlock = blockA.y <= blockB.y ? blockA : blockB
  const bottomBlock = leftBlock === blockA ? blockB : blockA

  return (
    leftBlock.x + leftBlock.width >= rightBlock.x && topBlock.y + topBlock.height >= bottomBlock.y
  )
}

function mergeBlocks(blocks: IBlock[], options: IBlockifyOptions): IBlock[] {
  const {mergeThresholdMultiplier = 1, threshold = 20} = options
  const mergeThreshold = mergeThresholdMultiplier * threshold
  if (mergeThreshold === 0) return blocks

  const queue = blocks.slice()
  const output: IBlock[] = []

  while (queue.length) {
    let block = queue.shift()!
    for (let i = 0; i < queue.length; i++) {
      const candidate = queue[i]
      if (!doBlockBoxesOverlap(block, candidate)) continue
      const colorA = [block.r, block.g, block.b] as [number, number, number]
      const colorB = [candidate.r, candidate.g, candidate.b] as [number, number, number]
      if (colorDistance(colorA, colorB) > mergeThreshold) continue

      // We're merging!!
      queue.splice(i, 1)
      i--

      const newX = Math.min(block.x, candidate.x)
      const newY = Math.min(block.y, candidate.y)
      const newCount = block.count + candidate.count

      block = {
        x: newX,
        y: newY,
        width: Math.max(block.x + block.width, candidate.x + candidate.width) - newX,
        height: Math.max(block.y + block.height, candidate.y + candidate.height) - newY,
        count: newCount,
        r: Math.round((block.r * block.count + candidate.r * candidate.count) / newCount),
        g: Math.round((block.g * block.count + candidate.g * candidate.count) / newCount),
        b: Math.round((block.b * block.count + candidate.b * candidate.count) / newCount),
      }
    }

    output.push(block)
  }

  return output
}

function colorizeByMergedBlocks(
  imageData: IAnnotatedImageData,
  blocks: IBlock[],
): IAnnotatedImageData {
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const fakeBlock: IBlock = {x, y, width: 0, height: 0, count: 0, r: 0, g: 0, b: 0}
      const index = ImageData.indexFor(imageData, x, y)
      const color = [
        imageData.data[index],
        imageData.data[index + 1],
        imageData.data[index + 2],
      ] as [number, number, number]

      let minDistance = Infinity
      let minBlock = blocks[0]
      for (const block of blocks) {
        if (!doBlockBoxesOverlap(block, fakeBlock)) continue
        const distance = colorDistance(color, [block.r, block.g, block.b])
        if (distance < minDistance) {
          minBlock = block
          minDistance = distance
        }
      }

      imageData.data[index] = minBlock.r
      imageData.data[index + 1] = minBlock.g
      imageData.data[index + 2] = minBlock.b
    }
  }

  return imageData
}

export async function blockify(
  imageData: IAnnotatedImageData,
  options: IBlockifyOptions = {},
): Promise<{imageData: IAnnotatedImageData; blocks: IBlock[]}> {
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

  const mergedBlocks = mergeBlocks(blocks, options)

  return {
    imageData:
      !options.recolorAfterMerge || mergedBlocks.length === blocks.length ? output : colorizeByMergedBlocks(output, mergedBlocks),
    blocks: mergedBlocks,
  }
}
