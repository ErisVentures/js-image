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
    const input = this._getInput(entry.input)

    let image = Image.from(input)
    Object.keys(entry.settings).forEach(key => {
      if (typeof image[key] !== 'function') throw new Error(`Image.${key} is not a function`)
      image = image[key](entry.settings[key])
    })

    const result = await image[entry.action]()
    let output = result

    if (Buffer.isBuffer(result)) {
      this._cachedFiles.set(entry.output, result)
    } else {
      if (result.hash && typeof result.hash.every === 'function') {
        result.hash = Buffer.from(result.hash).toString('hex')
      }

      output = JSON.stringify(result, null, 2)
    }

    if (entry.toDisk) {
      fs.writeFileSync(entry.output, output)
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
