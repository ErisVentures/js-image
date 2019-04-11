import * as sharp from 'sharp'

import {BufferLike, IMetadata, Colorspace} from './types'
import {IAnnotatedImageData, ImageData} from './image-data'

sharp.cache({memory: 200})

export class SharpImage {
  public static from(bufferOrImageData: BufferLike | IAnnotatedImageData): sharp.Sharp {
    if (ImageData.probablyIs(bufferOrImageData)) {
      let imageData = ImageData.normalize(bufferOrImageData)
      ImageData.assert(imageData)
      imageData = ImageData.toRGB(imageData)
      return sharp(Buffer.from(imageData.data), {
        raw: {
          channels: 3,
          width: imageData.width,
          height: imageData.height,
        },
      })
    } else if (Buffer.isBuffer(bufferOrImageData)) {
      return sharp(bufferOrImageData)
    } else {
      throw new TypeError('Must be Buffer or image data')
    }
  }
  public static toMetadata(image: sharp.Sharp): Promise<IMetadata> {
    return image.metadata().then(metadata => {
      let {width = 0, height = 0} = metadata
      if ((metadata.orientation || 0) > 4) {
        const realHeight = width
        width = height
        height = realHeight
      }
      return {
        width,
        height,
        aspectRatio: width / height,
      }
    })
  }
  public static async toImageData(image: sharp.Sharp): Promise<IAnnotatedImageData> {
    const rawData = await (image.clone().raw().toBuffer as any)({resolveWithObject: true})
    const {width, height, size} = rawData.info
    const channels = size / width / height
    return {
      channels,
      width,
      height,
      colorspace: channels === 3 ? Colorspace.RGB : Colorspace.Greyscale,
      data: rawData.data,
    }
  }
}
