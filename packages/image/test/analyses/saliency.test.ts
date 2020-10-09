import {saliency} from '../../lib/analyses/saliency'
import {IAnnotatedImageData} from '../../lib/image-data'
import {sobel} from '../../lib/transforms/sobel'
import {fixtureDecode, compareToFixture} from '../utils'

const debugImages = [
  'source-sydney.jpg',
  'source-skater.jpg',
  'source-bride.jpg',
  'source-faces-couple.jpg',
  'source-yosemite.jpg',
  'source-car.jpg',
  'source-book.png',
  'source-face-group.jpg',
]

async function writeDebugImages(): Promise<void> {
  const writeImage = (imageData: IAnnotatedImageData, name: string) =>
    compareToFixture(imageData, name.replace('source-', ''), {strict: false}).catch(() => null)

  for (const image of debugImages) {
    const srcImageData = await fixtureDecode(image)
    const options = {}
    const {imageData, quantized, contrastImageData, positionImageData, blocks} = await saliency(
      srcImageData,
      options,
    )

    await writeImage(sobel(srcImageData), `saliency-${image}-edges.jpg`)
    await writeImage(imageData, `saliency-${image}.jpg`)
    await writeImage(quantized, `saliency-${image}-quantized.jpg`)
    await writeImage(contrastImageData, `saliency-${image}-contrast.jpg`)
    await writeImage(positionImageData, `saliency-${image}-position.jpg`)
  }
}

describe('#analyses/saliency', () => {
  if (process.env.DEBUG) {
    it.only('should quantize all images', async () => {
      await writeDebugImages()
    })
  }

  it('should quantize an image', async () => {
    const srcImageData = await fixtureDecode('source-yosemite.jpg')
    const options = {}
    const {imageData, blocks} = await saliency(srcImageData, options)

    await compareToFixture(imageData, 'saliency-yosemite.jpg', {strict: false})
    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })

  it('should quantize an image with just analysis', async () => {
    const srcImageData = await fixtureDecode('source-yosemite.jpg')
    const {blocks} = await saliency(srcImageData, {saliencyMode: 'analysis'})

    expect(blocks.reduce((a, b) => a + b.count, 0)).toBeCloseTo(1, 1)
  })
})
