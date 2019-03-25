import * as sharp from 'sharp'

import {
  BufferLike,
  IMetadata,
  Colorspace,
  ImageFormat,
  ImageResizeFit,
  DEFAULT_FORMAT,
} from './types'
import {Image} from './image'
import {IAnnotatedImageData, ImageData} from './image-data'
import {instrumentation} from './instrumentation'

sharp.cache({memory: 200})

class SharpImage {
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

export class NodeImage extends Image {
  private readonly _image: sharp.Sharp
  private readonly _metadata: object | undefined

  public constructor(image: sharp.Sharp, metadata?: object) {
    super()
    this._image = image
    this._metadata = metadata
  }

  private _applyFormat(image: sharp.Sharp): sharp.Sharp {
    const {format = DEFAULT_FORMAT} = this._output
    if (format.type === ImageFormat.JPEG) {
      return image.jpeg(format)
    } else if (format.type === ImageFormat.PNG) {
      return image.png()
    } else if (format.type !== ImageFormat.NoTranscode) {
      throw new Error(`Unsupported format: ${format.type}`)
    }

    return image
  }

  private async _applyResize(image: sharp.Sharp): Promise<sharp.Sharp> {
    if (!this._output.resize) {
      return image
    }

    const {width, height, fit, subselect, doNotEnlarge} = this._output.resize
    if (doNotEnlarge) {
      const {width: realWidth = 0, height: realHeight = 0} = await image.metadata()
      if (typeof width === 'number' && realWidth < width) return image
      if (typeof height === 'number' && realHeight < height) return image
    }

    if (subselect) {
      image = image.extract({
        top: subselect.top,
        left: subselect.left,
        width: subselect.right - subselect.left,
        height: subselect.bottom - subselect.top,
      })
    }

    let sharpFit: sharp.ResizeOptions['fit']
    switch (fit) {
      case ImageResizeFit.Contain:
        sharpFit = 'inside'
        break
      case ImageResizeFit.Cover:
        sharpFit = 'outside'
        break
      case ImageResizeFit.Exact:
        sharpFit = 'fill'
        break
      case ImageResizeFit.Crop:
      default:
        sharpFit = 'cover'
    }

    return image.resize(width, height, {fit: sharpFit})
  }

  private _applyGreyscale(image: sharp.Sharp): sharp.Sharp {
    if (!this._output.greyscale || this._output.edges) {
      return image
    }

    return image.greyscale()
  }

  private async _applyImageDataTransforms(image: sharp.Sharp): Promise<sharp.Sharp> {
    if (
      !this._output.effects &&
      !this._output.edges &&
      !this._output.layers &&
      !this._output.tone &&
      !this._output.sharpen &&
      !this._output.calibrate
    ) {
      return image
    }

    let imageData = await SharpImage.toImageData(image)
    imageData = ImageData.toRGBA(imageData)
    imageData = await this._applyLayers(imageData)
    imageData = await this._applyCalibrate(imageData)
    imageData = await this._applyTone(imageData)
    imageData = await this._applySharpen(imageData)
    imageData = await this._applyEdges(imageData)
    imageData = await this._applyEffects(imageData)
    return SharpImage.from(imageData)
  }

  private async _applyAll(imagePromise: sharp.Sharp): Promise<sharp.Sharp> {
    let image = await imagePromise

    // Make sure the image is rotated according to EXIF
    image = image.rotate()

    image = await this._applyResize(image)
    image = await this._applyGreyscale(image)
    image = await this._applyImageDataTransforms(image)
    image = await this._applyFormat(image)
    return image
  }

  public toMetadata(): Promise<IMetadata> {
    return SharpImage.toMetadata(this._image).then(metadata => {
      return {...this._metadata, ...metadata}
    })
  }

  public toImageData(): Promise<IAnnotatedImageData> {
    return this._applyAll(this._image.clone()).then(SharpImage.toImageData)
  }

  public async toBuffer(): Promise<BufferLike> {
    const image: any = await this._applyAll(this._image.clone())
    const format = this._output.format || DEFAULT_FORMAT
    if (format.type === ImageFormat.NoTranscode) {
      const buffer = image.options && image.options.input && image.options.input.buffer
      if (!buffer) throw new Error('Unable to extract original buffer for NoTranscode')
      return buffer
    }

    return image.toBuffer()
  }

  protected static _fromBuffer(buffer: BufferLike, metadata?: object): Image {
    return new NodeImage(SharpImage.from(buffer), metadata)
  }

  protected static _fromImageData(imageData: IAnnotatedImageData): Image {
    return new NodeImage(SharpImage.from(imageData))
  }
}

instrumentation.wrapAllMethods(NodeImage.prototype)
