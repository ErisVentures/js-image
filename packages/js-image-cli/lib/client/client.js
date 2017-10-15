const path = require('path')
const spawn = require('child_process').spawn
const EventEmitter = require('events')

class CLIInstance extends EventEmitter {
  constructor(cmd, args) {
    super()
    this._finished = false
    this._error = null
    this._entries = []

    try {
      this._childProcess = spawn(cmd, args)
      this._listenToProcessEvents()
    } catch (err) {
      this._emitDone(err)
    }
  }

  _emitDone(err) {
    this._finished = true
    if (err) {
      this._error = err
      this.emit('done', {failed: true, err})
    } else {
      this.emit('done', {failed: true, entries: this._entries})
    }
  }

  _listenToProcessEvents() {
    this._childProcess.on('error', err => this._emitDone(err))
    this._childProcess.on('exit', code => {
      if (code === 0) {
        this._emitDone()
      } else {
        this._emitDone(new Error(`Process exited with exit code ${code}`))
      }
    })

    this._childProcess.stdout.on('data', chunk => {
      try {
        const message = JSON.parse(chunk)
        if (message.type === 'entryFinished') {
          this._entries.push(message.data)
        } else if (message.type === 'entryErrored') {
          this._entries.push(Object.assign({failed: true}, message.data))
        }
      } catch (err) {}
    })
  }

  _entriesToPromise(options = {}) {
    const failedEntry = this._entries.find(entry => entry.failed)
    if (options.failLoudly && failedEntry) {
      const error = new Error(failedEntry.message)
      error.originalStack = error.stack
      return Promise.reject(error)
    }

    return Promise.resolve(this._entries)
  }

  waitForExit(options) {
    if (this._finished) {
      return this._error ?
        Promise.reject(this._error) :
        this._entriesToPromise(options)
    }

    return new Promise(resolve => this.once('done', resolve))
      .then(() => this.waitForExit(options))
  }
}

class CLIClient {
  constructor(options) {
    this._options = Object.assign({
      executablePath: path.join(__dirname, '../../bin/index.js'),
    }, options)
  }

  run(config) {
    const args = [
      '-c',
      typeof config === 'string' ? config : JSON.stringify(config),
      '--reporter=json',
    ]

    return new CLIInstance(this._options.executablePath, args)
  }
}

module.exports = CLIClient
