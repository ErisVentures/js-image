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

  describe('.toBuffer', unimplemented(() => new Image().toBuffer()))
  describe('#from', unimplemented(() => Image.from(skater)))
})
