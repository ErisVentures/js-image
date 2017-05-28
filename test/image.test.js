const fs = require('fs')
const sinon = require('sinon')
const Image = require('../lib/image').Image
const {expect, fixture, fixturePath} = require('./utils')

const skater = fixture('skater.jpg')
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
        format: {type: 'jpeg'},
      })
    })
  })

  describe('.format', () => {
    let image

    beforeEach(() => {
      image = new Image()
    })

    it('should set format', () => {
      image = image.format(Image.PNG)
      expect(image._output).to.have.property('format').eql({type: Image.PNG})
    })

    it('should set format options', () => {
      const opts = {type: Image.JPEG, quality: 70}
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
      const options = {width: 200, height: 300, method: Image.COVER}
      image = image.resize(options)
      expect(image._output).to.have.property('resize').eql(options)
    })

    it('should accept just width', () => {
      const options = {width: 200, height: Image.AUTO_SIZE, method: Image.CONTAIN}
      image = image.resize(options)
      expect(image._output).to.have.property('resize').eql(options)
    })

    it('should accept just height', () => {
      const options = {width: Image.AUTO_SIZE, height: 300, method: Image.CROP}
      image = image.resize(options)
      expect(image._output).to.have.property('resize').eql(options)
    })

    it('should throw if width and height are missing', () => {
      const options = {method: Image.COVER}
      expect(() => image.resize(options)).to.throw('Must specify a width or height')
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
