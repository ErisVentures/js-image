const fs = require('fs')
const Image = require('@eris/image').Image

class Runner {
  constructor(reporter, entries) {
    this._reporter = reporter
    this._entries = entries
    this._cachedFiles = new Map()
  }

  _getInput(input) {
    if (this._cachedFiles.has(input)) {
      return this._cachedFiles.get(input)
    }

    return fs.readFileSync(input)
  }

  async _processEntry(entry) {
    this._reporter.entryStarted(entry)
    if (fs.existsSync(entry.output) && !entry.force) {
      let result
      if (entry.action === 'toBuffer') {
        const buffer = fs.readFileSync(entry.output)
        result = buffer
        this._cachedFiles.set(entry.output, buffer)
      } else {
        const string = fs.readFileSync(entry.output, 'utf8')
        result = JSON.parse(string)
        this._cachedFiles.set(entry.output, string)
      }

      this._reporter.entryFinished(entry, result)
      return
    }

    const input = this._getInput(entry.input)

    let image = Image.from(input)
    Object.keys(entry.settings).forEach(key => {
      if (typeof image[key] !== 'function') throw new Error(`Image.${key} is not a function`)
      image = image[key](entry.settings[key])
    })

    const result = await image[entry.action]()
    let buffer = result

    if (Buffer.isBuffer(result)) {
      this._cachedFiles.set(entry.output, result)
    } else {
      buffer = JSON.stringify(result, null, 2)
    }

    if (entry.toDisk) {
      fs.writeFileSync(entry.output, buffer)
    }

    this._reporter.entryFinished(entry, result)
  }

  async run() {
    this._reporter.started()

    for (const entry of this._entries) {
      try {
        await this._processEntry(entry)
      } catch (err) {
        this._reporter.entryErrored(entry, err)
      }
    }

    this._reporter.finished()
  }
}

module.exports = Runner
