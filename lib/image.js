class Image {
  static isImageData(obj) {
    if (!obj || !obj.data || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
      return false
    }

    return obj.data.length === obj.width * obj.height * 4
  }

  static from() {
    throw new Error('unimplemented')
  }
}

module.exports = Image
