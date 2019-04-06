import * as fs from 'fs'
import * as sinon from 'sinon'
import {Image} from '../lib/image'
import {expect, fixture, fixturePath} from './utils'
import {ImageFormat, HashMethod} from '../lib/types'

class ImageImpl extends Image {
  public toMetadata(): Promise<import('../lib/types').IMetadata> {
    throw new Error('Method not implemented.')
  }
  public toImageData(): Promise<import('../lib/image-data').IAnnotatedImageData> {
    throw new Error('Method not implemented.')
  }
  public toBuffer(): Promise<import('../dist/types').BufferLike> {
    throw new Error('Method not implemented.')
  }
}

const skater = fixture('source-skater.jpg')
describe('Image', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.reset()
  })

  describe('.options', () => {
    it('should set many options at once', () => {
      const image = new ImageImpl().options({
        format: {type: ImageFormat.PNG},
        greyscale: true,
        analyze: {hash: {method: HashMethod.PHash}},
      }) as any

      expect(image._output).to.eql({
        format: {type: 'png'},
        greyscale: true,
      })

      expect(image._analyze).to.eql({hash: {method: 'phash'}})
    })
  })

  describe('.format', () => {
    let image

    beforeEach(() => {
      image = new ImageImpl()
    })

    it('should set format', () => {
      image = image.format('png')
      expect(image._output)
        .to.have.property('format')
        .eql({type: 'png'})
    })

    it('should set format options', () => {
      const opts = {type: 'jpeg', quality: 70}
      image = image.format(opts)
      expect(image._output)
        .to.have.property('format')
        .eql(opts)
    })
  })

  describe('.resize', () => {
    let image

    beforeEach(() => {
      image = new ImageImpl()
    })

    it('should set resize', () => {
      const options = {
        width: 200,
        height: 300,
        fit: 'cover',
        method: 'nearest_neighbor',
      }
      image = image.resize(options)
      expect(image._output)
        .to.have.property('resize')
        .eql(options)
    })

    it('should accept just width', () => {
      const options = {
        width: 200,
        height: undefined,
        fit: 'auto',
        method: 'bilinear',
      }
      image = image.resize(options)
      expect(image._output)
        .to.have.property('resize')
        .eql(options)
    })

    it('should accept just height', () => {
      const options = {
        width: undefined,
        height: 300,
        fit: 'exact',
      }
      image = image.resize(options)
      expect(image._output)
        .to.have.property('resize')
        .eql({
          width: undefined,
          height: 300,
          fit: 'exact',
          method: 'bilinear',
        })
    })

    it('should throw if width and height are missing', () => {
      const options = {fit: 'exact'}
      expect(() => image.resize(options)).to.throw('Must specify')
    })

    it('should throw if width or height are missing', () => {
      const options = {width: 200, fit: 'cover'}
      expect(() => image.resize(options)).to.throw('Must specify')
    })
  })

  describe('.toFile', () => {
    let image
    beforeEach(() => {
      image = new ImageImpl()
      image.toBuffer = () => Promise.resolve(skater)
    })

    it('should write buffer to file', () => {
      const path = fixturePath('actual-to-file.jpg')
      return image.toFile(path).then(() => {
        const result = fs.readFileSync(path)
        expect(result.length).to.equal(skater.length)
      })
    })
  })
})
