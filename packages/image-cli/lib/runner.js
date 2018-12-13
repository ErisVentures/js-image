const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const Image = require('@eris/image').Image

class Runner {
  constructor(reporter, configEntries) {
    this._reporter = reporter
    this._entries = configEntries
    this._cachedFiles = new Map()
  }

  _checkForNecessaryFiles(filePaths) {
    if (filePaths.length) return

    for (const entry of this._entries) {
      if (entry.input.includes('<%= file') || entry.output.includes('<%= file')) {
        throw new Error('Entry demanded a file but none provided')
      }
    }
  }

  _fileExistsInCacheOrDisk(filePath) {
    return this._cachedFiles.has(filePath) || fs.existsSync(filePath)
  }

  _getBufferFromCacheOrDisk(filePath) {
    if (this._cachedFiles.has(filePath)) {
      return this._cachedFiles.get(filePath)
    }

    return fs.readFileSync(filePath)
  }

  _processCachedEntry(entry) {
    let result
    if (entry.action === 'toBuffer') {
      const buffer = this._getBufferFromCacheOrDisk(entry.output)
      result = buffer
      this._cachedFiles.set(entry.output, buffer)
    } else if (entry.action === 'toAnalysis' || entry.action === 'toMetadata') {
      const string = fs.readFileSync(entry.output, 'utf8')
      result = JSON.parse(string)
      this._cachedFiles.set(entry.output, string)
    } else if (!entry.action) {
      result = this._getBufferFromCacheOrDisk(entry.input)
    } else {
      throw new Error(`Unrecognized action "${entry.action}"`)
    }

    this._reporter.entryFinished(entry, result)
  }

  /**
   * @param {ConfigEntry} entry
   * @param {{file: FileEntry, cwd: string}} context
   */
  async _processEntry(entry, context) {
    entry = _.clone(entry)
    entry.force = Boolean(entry.force || context.force)
    entry.input = _.template(entry.input)(context)
    entry.output = _.template(entry.output)(context)

    this._reporter.entryStarted(entry)
    if (this._fileExistsInCacheOrDisk(entry.output) && !entry.force) {
      return this._processCachedEntry(entry)
    }

    const input = this._getBufferFromCacheOrDisk(entry.input)

    let image = Image.from(input)
    Object.keys(entry.settings).forEach(key => {
      if (typeof image[key] !== 'function') throw new Error(`Image.${key} is not a function`)
      image = image[key](entry.settings[key])
    })

    const result = entry.action ? await image[entry.action]() : input
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

  async run(filePaths = [], options) {
    this._reporter.started()
    this._checkForNecessaryFiles(filePaths)

    const force = (options && options.force) || process.env.FORCE
    const cwd = process.cwd()
    if (!filePaths.length) {
      filePaths = ['/dev/null']
    }

    for (const filePath of filePaths) {
      const fullPath = path.resolve(cwd, filePath)
      const extension = path.extname(fullPath)

      const file = {
        path: fullPath,
        pathWithoutExtension: fullPath.slice(0, -1 * extension.length),
        dirname: path.dirname(fullPath),
        basename: path.basename(fullPath),
        basenameWithoutExtension: path.basename(fullPath, extension),
        extension,
      }

      for (const entry of this._entries) {
        try {
          await this._processEntry(entry, {file, cwd, force})
        } catch (err) {
          this._reporter.entryErrored(entry, err)
        }
      }
    }

    this._reporter.finished()
  }
}

module.exports = Runner
