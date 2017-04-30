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
