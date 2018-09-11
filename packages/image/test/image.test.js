const fs = require('fs')
const sinon = require('sinon')
const Image = require('../dist/image').Image
const {expect, fixture, fixturePath} = require('./utils')

const skater = fixture('source-skater.jpg')
describe('Image', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.reset()
  })

  describe('#constructor', () => {
    it('should default output', () => {
      const output = new Image()._output
      expect(output).to.eql({
        format: {type: 'jpeg', quality: 90},
      })
    })
  })

  describe('.format', () => {
    let image

    beforeEach(() => {
      image = new Image()
    })

    it('should set format', () => {
      image = image.format('png')
      expect(image._output).to.have.property('format').eql({type: 'png'})
    })

    it('should set format options', () => {
      const opts = {type: 'jpeg', quality: 70}
      image = image.format(opts)
      expect(image._output).to.have.property('format').eql(opts)
    })

    it('should throw on unexpected formats', () => {
      expect(() => image.format('jpg')).to.throw
      expect(() => image.format('gif')).to.throw
    })
  })

  describe('.resize', () => {
    let image

    beforeEach(() => {
      image = new Image()
    })

    it('should set resize', () => {
      const options = {
        width: 200,
        height: 300,
        fit: 'cover',
        method: 'nearest_neighbor',
      }
      image = image.resize(options)
      expect(image._output).to.have.property('resize').eql(options)
    })

    it('should accept just width', () => {
      const options = {
        width: 200,
        height: undefined,
        fit: 'auto',
        method: 'bilinear',
      }
      image = image.resize(options)
      expect(image._output).to.have.property('resize').eql(options)
    })

    it('should accept just height', () => {
      const options = {
        width: undefined,
        height: 300,
        fit: 'exact',
      }
      image = image.resize(options)
      expect(image._output).to.have.property('resize').eql({
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
      image = new Image()
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
