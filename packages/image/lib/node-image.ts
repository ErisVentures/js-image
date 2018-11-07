import * as sharp from 'sharp'

import {BufferLike, IMetadata, Colorspace, ImageFormat, ImageResizeFit} from './types'
import {Image} from './image'
import {IAnnotatedImageData, ImageData} from './image-data'

class SharpImage {
  public static from(bufferOrImageData: BufferLike | IAnnotatedImageData): sharp.SharpInstance {
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

  public static toMetadata(image: sharp.SharpInstance): Promise<IMetadata> {
    return image.metadata().then(metadata => {
      return {
        width: metadata.width!,
        height: metadata.height!,
        aspectRatio: metadata.width! / metadata.height!,
      }
    })
  }

  public static async toImageData(image: sharp.SharpInstance): Promise<IAnnotatedImageData> {
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
  private readonly _image: sharp.SharpInstance
  private readonly _metadata: object | undefined

  public constructor(image: sharp.SharpInstance, metadata?: object) {
    super()
    this._image = image
    this._metadata = metadata
  }

  private _applyFormat(image: sharp.SharpInstance): sharp.SharpInstance {
    if (this._output.format.type === ImageFormat.JPEG) {
      return image.jpeg(this._output.format)
    } else if (this._output.format.type === ImageFormat.PNG) {
      return image.png()
    } else {
      throw new Error(`Unsupported format: ${this._output.format.type}`)
    }
  }

  private _applyResize(image: sharp.SharpInstance): sharp.SharpInstance {
    if (!this._output.resize) {
      return image
    }

    const {width, height, fit, subselect} = this._output.resize
    if (subselect) {
      image = image.extract({
        top: subselect.top,
        left: subselect.left,
        width: subselect.right - subselect.left,
        height: subselect.bottom - subselect.top,
      })
    }

    image = image.resize(width, height)
    switch (fit) {
      case ImageResizeFit.Contain:
        image = image.max()
        break
      case ImageResizeFit.Cover:
        image = image.min()
        break
      case ImageResizeFit.Exact:
        image = image.ignoreAspectRatio()
        break
      case ImageResizeFit.Crop:
      default:
        image = image.crop(sharp.gravity.center)
    }

    return image
  }

  private _applyGreyscale(image: sharp.SharpInstance): sharp.SharpInstance {
    if (!this._output.greyscale || this._output.edges) {
      return image
    }

    return image.greyscale()
  }

  private async _applyImageDataTransforms(
    image: sharp.SharpInstance,
  ): Promise<sharp.SharpInstance> {
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

  private async _applyAll(imagePromise: sharp.SharpInstance): Promise<sharp.SharpInstance> {
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
    return this._applyAll(this._image).then(SharpImage.toImageData)
  }

  public toBuffer(): Promise<BufferLike> {
    return this._applyAll(this._image).then(image => image.toBuffer())
  }

  protected static _fromBuffer(buffer: BufferLike, metadata?: object): Image {
    return new NodeImage(SharpImage.from(buffer), metadata)
  }

  protected static _fromImageData(imageData: IAnnotatedImageData): Image {
    return new NodeImage(SharpImage.from(imageData))
  }
}
