class Image {
  static get version() {
    return require('../package.json').version
  }
}

module.exports = Image
