const fs = require('fs')
const Image = require('@ouranos/image').NodeImage

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

  _processEntry(entry) {
    this._reporter.entryStarted(entry)
    const input = this._getInput(entry.input)

    let image = Image.from(input)
    Object.keys(entry.settings).forEach(key => {
      image = image[key](entry.settings[key])
    })

    return image[entry.action]()
      .then(result => {
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
      })
      .catch(err => this._reporter.entryErrored(entry, err))
  }

  run() {
    this._reporter.started()
    return this._entries
      .reduce((promise, config) => {
        return promise.then(() => this._processEntry(config))
      }, Promise.resolve())
      .then(() => this._reporter.finished())
  }
}

module.exports = Runner
