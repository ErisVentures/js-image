const fs = require('fs')
const sinon = require('sinon')
const Image = require('../lib/image')
const {expect, fixture, fixturePath} = require('./utils')

const unimplemented = func => () => {
  it('should error', () => expect(func).to.throw('unimplemented'))
}

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
    it('should default options', () => {
      const options = new Image()._options
      expect(options).to.eql({
        format: 'jpeg',
        formatOptions: {quality: 90},
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
      expect(image._options).to.have.property('format', Image.PNG)
    })

    it('should set formatOptions', () => {
      image = image.format(Image.JPEG, {quality: 70})
      expect(image._options).to.have.property('formatOptions').eql({quality: 70})
    })

    it('should throw on unexpected formats', () => {
      expect(() => image.format('jpg')).to.throw
      expect(() => image.format('gif')).to.throw
    })
  })

  describe('.toFile', () => {
    let image
    beforeEach(() => {
      image = new Image()
      sandbox.stub(image, 'toBuffer').returns(Promise.resolve(skater))
    })

    it('should write buffer to file', () => {
      const path = fixturePath('actual-to-file.jpg')
      return image.toFile(path).then(() => {
        const result = fs.readFileSync(path)
        expect(result.length).to.equal(skater.length)
      })
    })
  })

  describe('#isImageData', () => {
    const pixel = value => [value, value, value, 255]

    it('should identify invalid values', () => {
      expect(Image.isImageData()).to.be.false
      expect(Image.isImageData(null)).to.be.false
      expect(Image.isImageData(Buffer.from([]))).to.be.false
      expect(Image.isImageData(false)).to.be.false
      expect(Image.isImageData(2)).to.be.false
      expect(Image.isImageData({data: undefined})).to.be.false
      expect(Image.isImageData({width: '2', height: 1, data: []})).to.be.false
    })

    it('should identify Array-based', () => {
      const pixels = [...pixel(128), ...pixel(255), ...pixel(0), ...pixel(0)]
      expect(Image.isImageData({width: 2, height: 2, data: pixels})).to.be.true
    })

    it('should identify Uint8Array-based', () => {
      expect(Image.isImageData({width: 10, height: 10, data: new Uint8Array(400)})).to.be.true
    })

    it('should enforce pixel length', () => {
      expect(Image.isImageData({width: 10, height: 10, data: new Uint8Array(100)})).to.be.false
    })
  })

  describe('.toBuffer', unimplemented(() => new Image().toBuffer()))
  describe('#from', unimplemented(() => Image.from(skater)))
})
