/* tslint:disable */
import {Image} from '../image'
import {IAnnotatedImageData, ImageData} from '../image-data'
import {IResizeOptions, ISubselectOptions, Colorspace} from '../types'

export function subselect(
  imageData: IAnnotatedImageData,
  options: ISubselectOptions,
): IAnnotatedImageData {
  if (
    options.top === 0 &&
    options.bottom === imageData.height &&
    options.left === 0 &&
    options.right === imageData.width
  ) {
    return imageData
  }

  ImageData.assert(imageData, [Colorspace.RGBA, Colorspace.RGB, Colorspace.Greyscale])

  const width = options.right - options.left
  const height = options.bottom - options.top
  var data = new Uint8Array(width * height * imageData.channels)
  var output = Object.assign({}, imageData, {width, height, data})

  for (var y = options.top; y < options.bottom; y++) {
    for (var x = options.left; x < options.right; x++) {
      var srcIndex = ImageData.indexFor(imageData, x, y)
      var dstIndex = ImageData.indexFor(output, x - options.left, y - options.top)

      for (var c = 0; c < imageData.channels; c++) {
        data[dstIndex + c] = imageData.data[srcIndex + c]
      }
    }
  }

  return output
}
