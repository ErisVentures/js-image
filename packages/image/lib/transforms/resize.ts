/* tslint:disable */
import {IResizeOptions, ImageResizeFit, Colorspace} from '../types'
import {IAnnotatedImageData, ImageData} from '../image-data'

export function normalizeOptions(
  imageData: IAnnotatedImageData,
  options: IResizeOptions,
): IResizeOptions {
  const originalWidth = imageData.width
  const originalHeight = imageData.height
  const originalAspectRatio = originalWidth / originalHeight

  let targetWidth = options.width
  let targetHeight = options.height
  const targetAspectRatio = targetWidth! / targetHeight!

  let subselect = options.subselect
  if (!subselect) {
    subselect = {top: 0, bottom: originalHeight, left: 0, right: originalWidth}
  }

  switch (options.fit) {
    case ImageResizeFit.Auto:
    case ImageResizeFit.Exact:
      if (!targetWidth && targetHeight) {
        targetWidth = targetHeight * originalAspectRatio
      } else if (targetWidth && !targetHeight) {
        targetHeight = targetWidth! / originalAspectRatio
      }
      break
    case ImageResizeFit.Contain:
      if (originalAspectRatio > targetAspectRatio) {
        targetHeight = targetWidth! / originalAspectRatio
      } else {
        targetWidth = targetHeight! * originalAspectRatio
      }
      break
    case ImageResizeFit.Cover:
      if (originalAspectRatio > targetAspectRatio) {
        targetWidth = targetHeight! * originalAspectRatio
      } else {
        targetHeight = targetWidth! / originalAspectRatio
      }
      break
    case ImageResizeFit.Crop:
      if (options.subselect) {
        targetWidth = options.subselect.right - options.subselect.left
        targetHeight = options.subselect.bottom - options.subselect.top
        break
      }

      let cropTargetWidth = originalWidth
      let cropTargetHeight = originalHeight

      if (originalAspectRatio > targetAspectRatio) {
        cropTargetWidth = originalHeight! * targetAspectRatio
      } else {
        cropTargetHeight = originalWidth! / targetAspectRatio
      }

      const heightMargin = (originalHeight - cropTargetHeight) / 2
      const widthMargin = (originalWidth - cropTargetWidth) / 2

      subselect = {
        top: Math.floor(heightMargin),
        bottom: originalHeight - Math.ceil(heightMargin),
        left: Math.floor(widthMargin),
        right: originalWidth - Math.ceil(widthMargin),
      }
      break
  }

  if (!targetWidth || !targetHeight) throw new Error('Invalid dimensions for resize')

  return Object.assign({}, options, {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight),
    subselect,
  })
}

export function nearestNeighbor(
  imageData: IAnnotatedImageData,
  options: IResizeOptions,
): IAnnotatedImageData {
  if (!options.width || !options.height) {
    throw new Error('Missing width or height')
  }

  ImageData.assert(imageData, [Colorspace.RGBA, Colorspace.RGB, Colorspace.Greyscale])

  const targetWidth = options.width!
  const targetHeight = options.height!
  const widthScaleFactor = imageData.width / targetWidth
  const heightScaleFactor = imageData.height / targetHeight

  const outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (var i = 0; i < targetWidth; i++) {
    for (var j = 0; j < targetHeight; j++) {
      const origX = Math.floor(i * widthScaleFactor)
      const origY = Math.floor(j * heightScaleFactor)

      const origPos = (origY * imageData.width + origX) * imageData.channels
      var outPos = (j * targetWidth + i) * imageData.channels

      for (var channel = 0; channel < imageData.channels; channel++) {
        outPixels[outPos + channel] = imageData.data[origPos + channel]
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    colorspace: imageData.colorspace,
  }
}

export function bilinear(
  imageData: IAnnotatedImageData,
  options: IResizeOptions,
): IAnnotatedImageData {
  if (!options.width || !options.height) {
    throw new Error('Missing width or height')
  }

  ImageData.assert(imageData, [Colorspace.RGBA, Colorspace.RGB, Colorspace.Greyscale])

  var targetWidth = options.width!
  var targetHeight = options.height!
  var widthScaleFactor = imageData.width / targetWidth
  var heightScaleFactor = imageData.height / targetHeight

  var boxResizeData: IAnnotatedImageData | null = null
  var boxResizeOptions: IResizeOptions | null = null
  if (widthScaleFactor >= 2 || heightScaleFactor >= 2) {
    const boxWidthScaleFactor = Math.max(Math.floor(widthScaleFactor), 1)
    const boxHeightScaleFactor = Math.max(Math.floor(heightScaleFactor), 1)
    if (widthScaleFactor === boxWidthScaleFactor && heightScaleFactor === boxHeightScaleFactor) {
      return box(imageData, options)
    }

    targetWidth = targetWidth * boxWidthScaleFactor
    targetHeight = targetHeight * boxHeightScaleFactor
    widthScaleFactor = imageData.width / targetWidth
    heightScaleFactor = imageData.height / targetHeight

    boxResizeOptions = options
    boxResizeData = {
      width: targetWidth,
      height: targetHeight,
      data: imageData.data,
      channels: imageData.channels,
      colorspace: imageData.colorspace,
    }
  }

  var outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (var i = 0; i < targetWidth; i++) {
    for (var j = 0; j < targetHeight; j++) {
      // Find the ideal X,Y coordinates we'd pull from
      var srcX = i * widthScaleFactor
      var srcY = j * heightScaleFactor
      var srcXFloor = Math.floor(srcX)
      var srcYFloor = Math.floor(srcY)

      // Compute the source indexes we'll pull from
      // We're trying to pull from the 4 closest pixels
      // A = floor(X), floor(Y)
      // D = ceil(X), ceil(Y)
      // - - A B - -
      // - - C D - -
      var srcXOffset = srcXFloor
      var srcRowIndexOffset = Math.floor(srcY) * imageData.width
      var srcIndexA = (srcRowIndexOffset + srcXOffset) * imageData.channels
      var srcIndexB = srcIndexA + imageData.channels
      var srcIndexC = (srcRowIndexOffset + imageData.width + srcXOffset) * imageData.channels
      var srcIndexD = srcIndexC + imageData.channels

      // Make sure the edges don't fly off the image data
      if (srcXFloor === imageData.width - 1) {
        srcIndexB = srcIndexA
        srcIndexD = srcIndexC
      }

      if (srcYFloor === imageData.height - 1) {
        srcIndexC = srcIndexA
        srcIndexD = srcIndexB
      }

      // Compute the weights each pixel will have using the distance
      var xDistanceA = srcX - srcXFloor
      var yDistanceA = srcY - srcYFloor
      var xWeightA = 1 - xDistanceA
      var yWeightB = 1 - yDistanceA
      var weightA = xWeightA * yWeightB
      var weightB = (1 - xWeightA) * yWeightB
      var weightC = xWeightA * (1 - yWeightB)
      var weightD = (1 - xWeightA) * (1 - yWeightB)
      var totalWeight = weightA + weightB + weightC + weightD

      var outIndex = (j * targetWidth + i) * imageData.channels

      for (var channel = 0; channel < imageData.channels; channel++) {
        var value =
          (imageData.data[srcIndexA + channel] * weightA) / totalWeight +
          (imageData.data[srcIndexB + channel] * weightB) / totalWeight +
          (imageData.data[srcIndexC + channel] * weightC) / totalWeight +
          (imageData.data[srcIndexD + channel] * weightD) / totalWeight
        outPixels[outIndex + channel] = Math.round(value)
      }
    }
  }

  if (boxResizeData && boxResizeOptions) {
    boxResizeData!.data = outPixels
    targetWidth = boxResizeOptions!.width!
    targetHeight = boxResizeOptions!.height!
    outPixels = box(boxResizeData, boxResizeOptions).data as Uint8Array
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    colorspace: imageData.colorspace,
  }
}

export function box(imageData: IAnnotatedImageData, options: IResizeOptions): IAnnotatedImageData {
  if (!options.width || !options.height) {
    throw new Error('Missing width or height')
  }

  ImageData.assert(imageData, [Colorspace.RGBA, Colorspace.RGB, Colorspace.Greyscale])

  const targetWidth = options.width!
  const targetHeight = options.height!
  const widthScaleFactor = imageData.width / targetWidth
  const heightScaleFactor = imageData.height / targetHeight
  if (widthScaleFactor < 1 || heightScaleFactor < 1) {
    throw new Error('Box resize can only shrink images')
  } else if (
    Math.floor(widthScaleFactor) !== widthScaleFactor ||
    Math.floor(heightScaleFactor) !== heightScaleFactor
  ) {
    throw new Error('Can only box resize in integer increments')
  }

  const outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels)

  for (var i = 0; i < targetWidth; i++) {
    for (var j = 0; j < targetHeight; j++) {
      var origX = Math.floor(i * widthScaleFactor)
      var origY = Math.floor(j * heightScaleFactor)

      var outPos = (j * targetWidth + i) * imageData.channels

      for (var channel = 0; channel < imageData.channels; channel++) {
        var value = 0
        for (var dx = 0; dx < widthScaleFactor; dx++) {
          for (var dy = 0; dy < heightScaleFactor; dy++) {
            var origPos = ((origY + dy) * imageData.width + (origX + dx)) * imageData.channels
            value += imageData.data[origPos + channel]
          }
        }

        outPixels[outPos + channel] = value / (widthScaleFactor * heightScaleFactor)
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    colorspace: imageData.colorspace,
  }
}
