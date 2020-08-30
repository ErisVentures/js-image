import * as jpeg from 'jpeg-js'
import {TIFFDecoder} from '@eris/exif'

import {ImageData} from '../lib/image-data'
import {NodeImage} from '../lib/node-image'
import {BrowserImage} from '../lib/browser-image'

import {expect, fixture, compareToFixture, testImage} from './utils'
import {ImageResizeFit, Colorspace, EdgeMethod, HashMethod, ImageFormat} from '../lib/types'

const sourceNef = fixture('source-google.nef')
const sourceCr2 = fixture('source-canon.cr2')
const skater = fixture('source-skater.jpg')
const sydney = fixture('source-sydney.jpg')
const couple = fixture('source-faces-couple.jpg')
const skaterRotated = fixture('source-skater-rotated.jpg')
const sydneyRotated = fixture('source-sydney-rotated.jpg')
const yosemite = fixture('source-yosemite.jpg')

// tslint:disable-next-line:variable-name
export function runImageTests(ImageImpl: typeof NodeImage | typeof BrowserImage): void {
  const testSkater = (...args: any[]) => testImage(ImageImpl, 'source-skater.jpg', ...args)
  const testYosemite = (...args: any[]) => testImage(ImageImpl, 'source-yosemite.jpg', ...args)
  const testOpera = (...args: any[]) => testImage(ImageImpl, 'source-sydney.jpg', ...args)
  const testWedding = (...args: any[]) => testImage(ImageImpl, 'source-wedding-1.jpg', ...args)

  describe(ImageImpl.name, () => {
    describe('._applyFormat', () => {
      it('should support jpeg', () => {
        const modify = img => img.format({type: 'jpeg', quality: 50})
        return testSkater('skater-poor.jpg', modify, {
          strict: false,
          tolerance: 10,
        })
      })

      it('should support png', () => {
        const modify = img => img.format('png')
        return testSkater('skater.png', modify, {strict: false})
      })
    })

    describe('._applyResize', () => {
      it('should support subselect', () => {
        const modify = img =>
          img
            .resize({
              width: 100,
              height: 80,
              fit: 'exact',
              subselect: {
                top: 200,
                bottom: 800,
                left: 100,
                right: 700,
              },
            })
            .format({type: 'jpeg', quality: 90})

        return testYosemite('yosemite-subselect.jpg', modify, {
          strict: false,
          tolerance: 35,
        })
      })

      it('should resize with bilinear', () => {
        const modify = img =>
          img.resize({
            width: 600,
            height: 750,
            method: 'bilinear',
          })
        return testYosemite('yosemite-bilinear-minor.jpg', modify, {
          strict: false,
          tolerance: 35,
        })
      })

      it('should support cover', () => {
        const modify = img =>
          img.resize({
            width: 200,
            height: 200,
            fit: 'cover',
          })

        return testYosemite('yosemite-square-cover.jpg', modify, {
          strict: false,
          tolerance: 30,
        })
      })

      it('should support contain', () => {
        const modify = img =>
          img.resize({
            width: 200,
            height: 200,
            fit: 'contain',
          })

        return testYosemite('yosemite-square-contain.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })

      it('should support crop', () => {
        const modify = img =>
          img.resize({
            width: 200,
            height: 200,
            fit: 'crop',
          })

        return testOpera('opera-square-crop.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })

      it('should support exact', () => {
        const modify = img =>
          img.resize({
            width: 200,
            height: 200,
            fit: 'exact',
          })

        return testOpera('opera-square-exact.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })

      it('should support doNotEnlarge', async () => {
        const modify = img =>
          img.resize({
            width: 10000,
            height: 10000,
            fit: 'cover',
            doNotEnlarge: true,
          })

        await testSkater('skater-image-data.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })
    })

    describe('._applyGreyscale', () => {
      it('should covert to greyscale', () => {
        const modify = img => img.greyscale()
        return testYosemite('yosemite-greyscale.jpg', modify, {
          strict: false,
          increment: 5,
          tolerance: 30,
        })
      })
    })

    describe('._applyLayers', () => {
      it('should merge multiple images', async () => {
        const sizeOptions = {width: 200, height: 200, fit: ImageResizeFit.Crop}
        const imageA = ImageImpl.from(skater).resize(sizeOptions)
        const imageB = ImageImpl.from(yosemite).resize(sizeOptions)
        const imageC = ImageImpl.from(sydney).resize(sizeOptions)

        const layers = [
          {imageData: await imageB.toImageData(), opacity: 0.5},
          {imageData: await imageC.toImageData(), opacity: 0.33},
        ]

        const buffer = await imageA.layers(layers).toBuffer()
        await compareToFixture(buffer, 'layers-merged.jpg', {strict: false, tolerance: 20})
      })
    })

    describe('._applyNormalize', () => {
      it('should apply a calibration profile', async () => {
        const modify = img => img.normalize({strength: 1})

        await testWedding('wedding-1-normalized.jpg', modify, {
          strict: false,
          tolerance: 10,
        })
      })
    })

    describe('._applyCalibrate', () => {
      it('should apply a calibration profile', async () => {
        const modify = img =>
          img.calibrate({
            redHueShift: -0.5,
            redSaturationShift: 0.5,
            greenHueShift: 0.5,
            greenSaturationShift: -0.5,
            blueHueShift: 0.5,
            blueSaturationShift: 0.5,
          })

        await testSkater('skater-calibrate.jpg', modify, {
          strict: false,
          tolerance: 10,
        })
      })
    })

    describe('._applyTone', () => {
      it('should increase contrast', async () => {
        const modify = img => img.tone({contrast: 0.5})
        await testSkater('skater-contrast.jpg', modify, {
          strict: false,
          increment: 5,
        })
      })

      it('should increase saturation', async () => {
        const modify = img => img.tone({saturation: 1})
        await testSkater('skater-saturation-plus.jpg', modify, {strict: false, tolerance: 20})
      })

      it('should decrease saturation', async () => {
        const modify = img => img.tone({saturation: -0.5})
        await testSkater('skater-saturation-minus.jpg', modify, {strict: false})
      })

      it('should apply multiple tone adjustments', async () => {
        const modify = img =>
          img.tone({
            whites: 30,
            highlights: -20,
            midtones: 30,
            shadows: 50,
            blacks: -20,
          })

        await testSkater('skater-tone.jpg', modify, {
          strict: false,
          increment: 5,
          tolerance: 10,
        })
      })

      it('should apply curves', async () => {
        const modify = img =>
          img.tone({
            curve: [
              [0, 50],
              [75, 65],
              [175, 185],
              [255, 200],
            ],
          })

        await testSkater('skater-curves.jpg', modify, {strict: false})
      })

      it('should apply R,G,B curves', async () => {
        const modify = img =>
          img.tone({
            redCurve: [
              [0, 0],
              [60, 80],
              [128, 128],
              [255, 255],
            ],
            greenCurve: [
              [0, 0],
              [128, 128],
              [192, 250],
              [255, 255],
            ],
            blueCurve: [
              [0, 0],
              [60, 60],
              [128, 60],
              [192, 192],
              [255, 255],
            ],
          })

        await testSkater('skater-curves-rgb.jpg', modify, {strict: false, tolerance: 20})
      })

      it('should apply HSL adjustments', async () => {
        const modify = (img: NodeImage) =>
          img.tone({
            hsl: [
              {
                targetHue: 220,
                targetBreadth: 60,
                hueShift: -30,
                saturationShift: 1,
                lightnessShift: -0.2,
              },
              {targetHue: 140, saturationShift: -1, lightnessShift: 0.1},
            ],
          })

        await testSkater('skater-tone-hsl.jpg', modify, {strict: false, tolerance: 20})
      })
    })

    describe('._applySharpen', () => {
      it('should sharpen the image', () => {
        const modify = img => img.sharpen()
        return testSkater('skater-sharpen.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })

      it('should sharpen the image with options', () => {
        const modify = img => img.sharpen({strength: 0.25})
        return testSkater('skater-sharpen-0.25.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })
    })

    describe('._applyEdges', () => {
      it('should find sobel edges', () => {
        const modify = img => img.edges()
        return testSkater('skater-edges-sobel.jpg', modify, {
          strict: false,
          tolerance: 25,
        })
      })

      it('should find canny edges', () => {
        const modify = img => img.edges('canny')
        return testSkater('skater-edges-canny.jpg', modify, {
          strict: false,
          tolerance: 35,
        })
      })

      it('should support options', () => {
        const modify = img =>
          img.edges({
            method: 'canny',
            radius: 3,
            blurSigma: 0,
          })
        return testSkater('skater-canny-radius-3.jpg', modify, {
          strict: false,
          tolerance: 35,
        })
      })
    })

    describe('._applyEffects', () => {
      it('should add noise', async () => {
        const modify = img => img.effects([{type: 'noise'}])
        await testSkater('skater-noise.jpg', modify, {strict: false})
      })
    })

    describe('.toAnalysis', () => {
      it('should hash an image', () => {
        return ImageImpl.from(skater)
          .analyze({
            hash: {method: HashMethod.PHash},
          })
          .toAnalysis()
          .then(analysis => {
            const result = parseInt(analysis.hash, 2).toString(16)
            expect(result).toBe('c5b7535fe4cb7000')
          })
      })

      it('should luma hash an image', () => {
        return ImageImpl.from(skater)
          .analyze({
            hash: {method: HashMethod.LumaHash, hashSize: 64},
          })
          .toAnalysis()
          .then(analysis => {
            const result = parseInt(analysis.hash, 2).toString(16)
            expect(result).toBe('c8e0fcfcffff7800')
          })
      })

      it('should compute sharpness', () => {
        return ImageImpl.from(skater)
          .analyze({
            sharpness: {},
          })
          .toAnalysis()
          .then(analysis => {
            expect(analysis).toHaveProperty('sharpness')

            const sharpness = analysis.sharpness
            expect(sharpness.percentEdges).toBeGreaterThanOrEqual(0.27)
            expect(sharpness.percentEdges).toBeLessThanOrEqual(0.28)
            expect(sharpness.median).toBeGreaterThanOrEqual(74)
            expect(sharpness.median).toBeLessThanOrEqual(76)
            expect(sharpness.average).toBeGreaterThanOrEqual(90)
            expect(sharpness.average).toBeLessThanOrEqual(95)
            expect(sharpness.upperVentileAverage).toBeGreaterThanOrEqual(228)
            expect(sharpness.upperVentileAverage).toBeLessThanOrEqual(232)
          })
      })

      it('should compute histograms', async () => {
        const analysis = await ImageImpl.from(skater)
          .analyze({
            histograms: {},
          })
          .toAnalysis()

        expect(analysis).toHaveProperty('histograms')

        const histograms = analysis.histograms
        const sum = arr => arr.reduce((x, y) => x + y, 0)
        const totalPixels = 256 * 256
        expect(sum(histograms.hue)).toBeGreaterThanOrEqual(totalPixels / 3)
        expect(sum(histograms.hue)).toBeLessThanOrEqual(totalPixels)
        expect(sum(histograms.saturation)).toBe(totalPixels)
        expect(sum(histograms.lightness)).toBe(totalPixels)
      })

      it('should compute composition', async () => {
        const analysis = await ImageImpl.from(skater)
          .analyze({
            composition: {},
          })
          .toAnalysis()

        expect(analysis).toHaveProperty('composition')

        const composition = analysis.composition
        expect(Math.round(100 * composition.ruleOfThirds)).toBe(28)
      })

      it('should compute faces', async () => {
        const analysis = await ImageImpl.from(couple)
          .analyze({
            sharpness: {},
            faces: {},
          })
          .toAnalysis()

        expect(analysis).toHaveProperty('faces')

        const faces = analysis.faces
        expect(faces.length).toBe(2)
        expect(faces[0].sharpness).toMatchObject({median: 37})
      })

      it('should compute objects', async () => {
        const analysis = await ImageImpl.from(couple)
          .analyze({
            objects: {},
          })
          .toAnalysis()

        expect(analysis).toHaveProperty('objects')

        const objects = analysis.objects
        expect(objects.length).toBe(5)
        expect(objects).toMatchObject([
          {object: 'person'},
          {object: 'person'},
          {object: 'pants'},
          {object: 'human_face'},
          {object: 'human_face'},
        ])
      })
    })

    describe('.toMetadata', () => {
      it('should compute the metadata of an image', () => {
        return ImageImpl.from(skater)
          .toMetadata()
          .then(metadata => {
            expect(metadata).toHaveProperty('width', 256)
            expect(metadata).toHaveProperty('height', 256)
            expect(metadata).toHaveProperty('aspectRatio', 1)
            expect(metadata).toHaveProperty('exif')
          })
      })

      it('should compute the metadata of a raw image', () => {
        return ImageImpl.from(fixture('source-google.nef'))
          .toMetadata()
          .then(metadata => {
            expect(metadata).toHaveProperty('width', 4928)
            expect(metadata).toHaveProperty('height', 3264)
            expect(metadata).toHaveProperty('exif.fNumber', 7.1)
          })
      })

      it('should compute the metadata of a portrait image', () => {
        return ImageImpl.from(yosemite)
          .toMetadata()
          .then(metadata => {
            expect(metadata).toHaveProperty('width', 1080)
            expect(metadata).toHaveProperty('height', 1350)
            expect(metadata).toHaveProperty('aspectRatio', 0.8)
            expect(metadata).toHaveProperty('exif')
          })
      })

      it.skip('should compute the metadata of a EXIF-rotated portrait image', () => {
        return ImageImpl.from(sydneyRotated)
          .toMetadata()
          .then(metadata => {
            expect(metadata).toHaveProperty('width', 600)
            expect(metadata).toHaveProperty('height', 1080)
            expect(metadata).toHaveProperty('aspectRatio', 600 / 1080)
            expect(metadata).toHaveProperty('exif')
          })
      })
    })

    describe('.toImageData', () => {
      it('should handle RGB image data', () => {
        const pixels = Buffer.from([
          // prettier:ignore
          ...[0, 0, 0, 0, 0, 0],
          ...[0, 0, 0, 0, 0, 0],
        ])

        const imageData = {
          width: 2,
          height: 2,
          channels: 3,
          colorspace: Colorspace.RGB,
          data: pixels,
        }

        return ImageImpl.from(imageData)
          .toImageData()
          .then(data => {
            expect(data).toEqual(imageData)
          })
      })

      it('should be fast', async () => {
        let imageData = await ImageImpl.from(skater).toImageData()
        for (let i = 0; i < 100; i++) {
          imageData = await ImageImpl.from(imageData).toImageData()
        }

        const srcImageData = ImageData.normalize(jpeg.decode(skater))
        if (imageData.colorspace === Colorspace.RGB) {
          const rgbData = ImageData.removeAlphaChannel(srcImageData)
          expect(imageData.data.length).toBe(rgbData.data.length)
        } else {
          expect(imageData.data.length).toBe(srcImageData.data.length)
        }
      })

      it('should generate a valid image data', async () => {
        const imageData = await ImageImpl.from(skater).toImageData()
        const buffer = jpeg.encode(ImageData.toRGBA(imageData), 90).data
        await compareToFixture(buffer, 'skater-image-data.jpg', {strict: false})
      })

      it('should handle rotated image data', async () => {
        const imageData = await ImageImpl.from(skaterRotated).toImageData()
        await compareToFixture(ImageData.toRGBA(imageData), 'skater-rotated.jpg', {strict: false})
      })

      it('should generate valid image data for transformed image', () => {
        return ImageImpl.from(skater)
          .greyscale()
          .resize({width: 120, height: 120})
          .toImageData()
          .then(imageData => {
            expect(imageData).toHaveProperty('channels', 1)
            expect(imageData).toHaveProperty('colorspace', 'k')
            expect(imageData).toHaveProperty('width', 120)
            expect(imageData).toHaveProperty('height', 120)
            expect(imageData.data).toHaveLength(120 * 120)
          })
      })

      it('should use clones for output', async () => {
        const image = ImageImpl.from(skater)
        const firstAttempt = await image.resize({width: 10, height: 10}).toImageData()
        expect(firstAttempt).toHaveProperty('width', 10)
        expect(firstAttempt).toHaveProperty('height', 10)
        const secondAttempt = await image.reset().toImageData()
        expect(secondAttempt).toHaveProperty('width', 256)
        expect(secondAttempt).toHaveProperty('height', 256)
      })
    })

    describe('.toBuffer', () => {
      it('should output the buffer', () => {
        const image = ImageImpl.from(skater)
        return image.toBuffer().then(buffer => {
          expect(buffer).toBeInstanceOf(Buffer)
          expect(buffer.length).toBeGreaterThanOrEqual(skater.length - 5000)
          expect(buffer.length).toBeLessThanOrEqual(skater.length + 5000)
        })
      })

      it('should output the original buffer without transcoding', async () => {
        const image = ImageImpl.from(sourceNef).format(ImageFormat.NoTranscode)
        const original = new TIFFDecoder(sourceNef).extractJPEG()
        expect(original.length).toBe(1078539)
        const buffer = await image.toBuffer()
        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBe(1078539)
      })

      it('should use clones for output', async () => {
        const image = ImageImpl.from(skater)
        const firstAttempt = await image.resize({width: 10, height: 10}).toBuffer()
        expect(firstAttempt.length).toBeLessThan(1000)
        const secondAttempt = await image.reset().toBuffer()
        expect(secondAttempt.length).toBeGreaterThan(10000)
      })
    })

    describe('#from', () => {
      it('should return an image from image data', () => {
        const image = ImageImpl.from(jpeg.decode(skater) as any)
        expect(image).toBeInstanceOf(ImageImpl)
      })

      it('should return an image from buffer', () => {
        const image = ImageImpl.from(skater)
        expect(image).toBeInstanceOf(ImageImpl)
      })

      it('should handle raw images', () => {
        const image = ImageImpl.from(sourceNef)
        expect(image).toBeInstanceOf(ImageImpl)
        return image
          .resize({width: 604, height: 400})
          .format({type: ImageFormat.JPEG, quality: 80})
          .toBuffer()
          .then(buffer => {
            return compareToFixture(buffer, 'google.jpg', {
              strict: false,
              increment: 10,
              tolerance: 30,
            })
          })
      })

      it('should handle canon raw images', async () => {
        const image = ImageImpl.from(sourceCr2)
        expect(image).toBeInstanceOf(ImageImpl)
        const buffer = await image.resize({width: 600, fit: ImageResizeFit.Auto}).toBuffer()
        await compareToFixture(buffer, 'canon.jpg', {strict: false, increment: 10, tolerance: 40})
      })
    })

    it('should support multiple sequential changes', () => {
      const image = ImageImpl.from(sourceNef)
      expect(image).toBeInstanceOf(ImageImpl)
      return image
        .resize({width: 604, height: 400})
        .greyscale()
        .edges({method: EdgeMethod.Canny, blurSigma: 0})
        .format({type: ImageFormat.JPEG, quality: 80})
        .toBuffer()
        .then(buffer => {
          return compareToFixture(buffer, 'google-canny.jpg', {
            strict: false,
            increment: 10,
            // TODO: lower this after implementing lanczos resize
            tolerance: 80,
          })
        })
    })
  })
}
