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

function computeHue_(color: [number, number, number]): number {
  const [r, g, b] = color.map(c => c / 255)
  const min = Math.min(r, g, b)
  const max = Math.max(r, g, b)
  const delta = max - min
  if (delta === 0) return 0

  let hue = 0
  if (max === r) {
    hue = (360 + (60 * (g - b)) / delta) % 360
  } else if (max === g) {
    hue = 60 * ((b - r) / delta + 2)
  } else {
    hue = 60 * ((r - g) / delta + 4)
  }

  return hue
}

export function hueColorDistance_(
  colorA: [number, number, number],
  colorB: [number, number, number],
): number {
  const hueA = computeHue_(colorA)
  const hueB = computeHue_(colorB)
  const hueDistance = Math.min(Math.abs(hueA - hueB), hueA + 360 - hueB, hueB + 360 - hueA) / 180
  return colorDistance(colorA, colorB) * (hueDistance + 0.25)
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

function computeBlockVibrance(block: Pick<IBlock, 'r' | 'g' | 'b'>): number {
  const min = Math.min(block.r, block.g, block.b)
  const max = Math.max(block.r, block.g, block.b)
  const delta = (max - min) / 255
  const lightness = (max + min) / 2 / 255
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  // The most vibrant color is the one that's closest to 100% saturation 50% lightness
  const vibrance = saturation * (1 - Math.abs(0.5 - lightness) / 0.5)
  return vibrance
}

/**
 * When merging colors by averaging, everything tends to become gray/brown which is undesirable for preserving what makes blocks unique.
 * Instead we vote for the hue based on the saturation of each block and attempt to preserve brighter colors
 */
function mergeBlockCandidates(blocks: Set<IBlock>, masterBlock: IBlock): IBlock {
  let count = 0
  let rVotes = 0
  let gVotes = 0
  let bVotes = 0

  for (const block of blocks) {
    count += block.count
    const vibrance = computeBlockVibrance(block)
    const max = Math.max(block.r, block.g, block.b)
    if (max === block.r) rVotes += vibrance * block.count
    else if (max === block.g) gVotes += vibrance * block.count
    else if (max === block.b) bVotes += vibrance * block.count
  }

  const maxVotes = Math.max(rVotes, gVotes, bVotes)
  const maxProp = rVotes === maxVotes ? 'r' : gVotes === maxVotes ? 'g' : 'b'

  let winningVibrance = -Infinity
  let winningBlock = masterBlock
  for (const block of blocks) {
    // If the block doesn't have the right winning dominant color, skip it
    const max = Math.max(block.r, block.g, block.b)
    if (max !== block[maxProp]) continue

    // If the block isn't more vibrant, skip it
    const vibrance = computeBlockVibrance(block)
    if (vibrance < winningVibrance) continue

    // It's the most vibrant block so far, keep it!
    winningVibrance = vibrance
    winningBlock = block
  }

  return {...masterBlock, count, r: winningBlock.r, g: winningBlock.g, b: winningBlock.b}
}

function mergeBlocks(
  blocks: IBlock[],
  options: IBlockifyOptions,
  merges: Map<IBlock, IBlock>,
): IBlock[] {
  const {mergeThresholdMultiplier = 1, threshold = 20} = options
  const mergeThreshold = mergeThresholdMultiplier * threshold
  if (mergeThreshold === 0) return blocks

  let queue = blocks
    .slice()
    .sort((a, b) => b.y - a.y || b.x - a.x || b.width - a.width || b.height - a.height)
  const output: IBlock[] = []

  while (queue.length) {
    let block = queue.pop()!
    const blocksToMerge = new Set([block])

    for (let i = 0; i < queue.length; i++) {
      const candidate = queue[queue.length - 1 - i]
      // All blocks from now on are going to start after this one ends, break
      if (candidate.y > block.y + block.height) break
      // Only consider merging if the bounding boxes overlap at all
      if (!doBlockBoxesOverlap(block, candidate)) continue
      // Only merge if the color distance is low enough
      const colorA = [block.r, block.g, block.b] as [number, number, number]
      const colorB = [candidate.r, candidate.g, candidate.b] as [number, number, number]
      const distance = hueColorDistance_(colorA, colorB)
      if (distance > mergeThreshold) continue

      // We're going to merge!
      const newX = Math.min(block.x, candidate.x)
      const newY = Math.min(block.y, candidate.y)

      blocksToMerge.add(candidate)
      block = {
        x: newX,
        y: newY,
        width: Math.max(block.x + block.width, candidate.x + candidate.width) - newX,
        height: Math.max(block.y + block.height, candidate.y + candidate.height) - newY,
        count: 0,
        r: 0,
        g: 0,
        b: 0,
      }
    }

    block = mergeBlockCandidates(blocksToMerge, block)
    queue = queue.filter(block => !blocksToMerge.has(block))
    output.push(block)
    for (const original of blocksToMerge) merges.set(original, block)
  }

  return output
}

function colorizeByMergedBlocks(
  imageData: IAnnotatedImageData,
  merges: Map<IBlock, IBlock>,
): IAnnotatedImageData {
  const originalBlocks = [...merges.keys()]
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const fakeBlock: IBlock = {x, y, width: 0, height: 0, count: 0, r: 0, g: 0, b: 0}
      const index = ImageData.indexFor(imageData, x, y)
      const color = [
        imageData.data[index],
        imageData.data[index + 1],
        imageData.data[index + 2],
      ] as [number, number, number]

      let minBlock = fakeBlock
      for (const originalBlock of originalBlocks) {
        if (color[0] !== originalBlock.r) continue
        if (color[1] !== originalBlock.g) continue
        if (color[2] !== originalBlock.b) continue
        if (x < originalBlock.x) continue
        if (y < originalBlock.y) continue
        if (x > originalBlock.x + originalBlock.width) continue
        if (y > originalBlock.y + originalBlock.height) continue

        minBlock = originalBlock
        while (merges.has(minBlock)) minBlock = merges.get(minBlock)!
        break
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
  const {blurRadius: blurRadiusRaw = 'auto', threshold = 20, minimumBlockSize = 0} = options
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

  const minBlockSize = output.height * output.width * minimumBlockSize
  const filteredBlocks = minBlockSize ? blocks.filter(block => block.count >= minBlockSize) : blocks
  const merges = new Map<IBlock, IBlock>()
  let mergedBlocks = filteredBlocks
  let lastMergedBlocks = filteredBlocks
  let steps = 0
  do {
    steps++
    lastMergedBlocks = mergedBlocks
    mergedBlocks = mergeBlocks(mergedBlocks, options, merges)
  } while (mergedBlocks.length < lastMergedBlocks.length && steps < 10)

  return {
    imageData:
      !options.recolorAfterMerge || mergedBlocks.length === blocks.length
        ? output
        : colorizeByMergedBlocks(output, merges),
    blocks: mergedBlocks,
  }
}
