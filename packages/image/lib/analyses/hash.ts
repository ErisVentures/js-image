// tslint:disable
import {ImageData} from '../image-data'
import {bilinear} from '../transforms/resize'

const DCT_COEFFICIENT = 1 / Math.sqrt(2)

function getDCTCoefficient(index: number): number {
  return index === 0 ? DCT_COEFFICIENT : 1
}

export function toBits(array: Uint8Array): number[] {
  const bits = []
  for (var i = 0; i < array.length; i++) {
    const byte = array[i]
    for (var k = 7; k >= 0; k--) {
      bits.push((byte >> k) & 1)
    }
  }
  return bits
}

export function computeDCT(imageData: ImageData): Uint8Array {
  const size = imageData.width
  const output = new Uint8Array(size * size)

  for (var u = 0; u < size; u++) {
    for (var v = 0; v < size; v++) {
      var value = 0
      for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
          const du = (i + 1 / 2) / size * u * Math.PI
          const dv = (j + 1 / 2) / size * v * Math.PI
          value += Math.cos(du) * Math.cos(dv) * imageData.data[j * size + i]
        }
      }

      value *= getDCTCoefficient(u) * getDCTCoefficient(v) / 4
      output[v * size + u] = value
    }
  }

  return output
}

export function reduceDCT(dct: Uint8Array, size: number): Uint8Array {
  const originalSize = Math.sqrt(dct.length)
  const output = new Uint8Array(size * size)

  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      output[j * size + i] = dct[j * originalSize + i]
    }
  }

  return output
}

export function averageAndThreshold(input: Uint8Array): Uint8Array {
  var sum = 0
  for (var i = 1; i < input.length; i++) {
    sum += input[i]
  }

  var average = sum / (input.length - 1)
  var output = new Uint8Array(input.length / 8)
  for (var i = 0; i < input.length; i++) {
    var index = Math.floor(i / 8)
    var bit = input[i] > average ? 1 : 0
    var bitPosition = 7 - (i % 8)
    output[index] = output[index] | (bit << bitPosition)
  }

  return output
}

/**
 * Heavily based on the method described in http://www.hackerfactor.com/blog/index.php?/archives/432-Looks-Like-It.html
 */
export function phash(imageData: ImageData, hashSize?: number): Uint8Array {
  hashSize = hashSize || 64
  if (hashSize % 8 !== 0) {
    throw new Error('Hash size must be a byte-multiple')
  }

  const thumbnailWidth = Math.sqrt(hashSize) * 4
  if (!Number.isInteger(thumbnailWidth)) {
    throw new Error('Hash size must be a square')
  }

  let thumbnail = imageData
  if (imageData.width !== thumbnailWidth ||
      imageData.height !== thumbnailWidth ||
      imageData.format !== ImageData.GREYSCALE) {
    const colorThumbnail = bilinear(imageData, {width: thumbnailWidth, height: thumbnailWidth})
    thumbnail = ImageData.toGreyscale(colorThumbnail)
  }

  const fullDCT = computeDCT(thumbnail)
  const partialDCT = reduceDCT(fullDCT, thumbnailWidth / 4)
  return averageAndThreshold(partialDCT)
}

export function hammingDistance(hashA: string|Uint8Array, hashB: string|Uint8Array) {
  const arrayA: any[] = typeof hashA === 'string' ? hashA.split('') : toBits(hashA)
  const arrayB: any[] = typeof hashB === 'string' ? hashB.split('') : toBits(hashB)

  var distance = 0
  for (var i = 0; i < arrayA.length; i++) {
    if (arrayA[i] !== arrayB[i]) {
      distance++
    }
  }

  return distance
}
