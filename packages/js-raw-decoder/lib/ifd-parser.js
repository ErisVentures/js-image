class IfdParser {
  static getDataTypeSize(dataType) {
    switch (dataType) {
      case 0: // ???
      case 1: // byte
      case 2: // ASCII-string
        return 1
      case 3: // word
        return 2
      case 4: // double word
      case 5: // rational number
        return 4
      default:
        throw new TypeError(`unknown datatype: ${dataType}`)
    }
  }

  static parseEntry(reader) {
    const tag = reader.read(2)
    const dataType = reader.read(2)
    const dataTypeSize = IfdParser.getDataTypeSize(dataType)
    const length = reader.read(4)
    const lengthInBytes = dataTypeSize * length
    let data = reader.readAsReader(4)
    let dataOffset = undefined
    if (lengthInBytes > 4) {
      dataOffset = data.read(4)
      data = undefined
    }

    return {tag, dataType, length, lengthInBytes, data, dataOffset}
  }

  static parseIfd(reader, startPosition) {
    reader.seek(startPosition)
    const numEntries = reader.read(2)
    const entries = []
    for (let i = 0; i < numEntries; i++) {
      entries.push(IfdParser.parseEntry(reader))
    }

    const nextIfdOffset = reader.read(4)
    return {entries, nextIfdOffset}
  }

  static getEntryData(reader, entry) {
    if (entry.data) return entry.data
    return reader.use(() => {
      reader.seek(entry.dataOffset)
      return reader.readAsReader(entry.lengthInBytes)
    })
  }

  static getSubIfdOffsets(reader, entries) {
    const offsets = []
    entries.forEach(entry => {
      if (entry.tag !== 330) return
      const entryReader = IfdParser.getEntryData(reader, entry)
      while (entryReader.hasNext()) {
        offsets.push(entryReader.read(4))
      }
    })
    return offsets
  }
}

module.exports = IfdParser
