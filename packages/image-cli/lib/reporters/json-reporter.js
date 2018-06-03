/* eslint-disable no-console */

class JsonReporter {
  constructor() {
    this._startTime = null
    this._entryStartTimes = new Map()
  }

  _log(obj) {
    console.log(JSON.stringify(obj))
  }

  started() {
    this._startTime = Date.now()
    this._log({type: 'started', data: {}})
  }

  finished() {
    const timeTaken = Date.now() - this._startTime
    this._log({type: 'finished', data: {timeTaken}})
  }

  entryStarted(config) {
    this._entryStartTimes.set(config.id, Date.now())

    const id = config.id
    const input = config.input
    const data = {id, input}
    this._log({type: 'entryStarted', data})
  }

  entryFinished(config, result) {
    const id = config.id
    const input = config.input
    const output = config.output
    const timeTaken = Date.now() - this._entryStartTimes.get(id)
    const data = {id, input, output, timeTaken}
    if (config.toReporter) {
      data.result = result
    }

    this._log({type: 'entryFinished', data})
  }

  entryErrored(config, err) {
    const id = config.id
    const input = config.input
    const timeTaken = Date.now() - this._entryStartTimes.get(id)
    const message = err.message
    const stack = err.stack
    const data = {id, input, timeTaken, message, stack}
    this._log({type: 'entryErrored', data})
  }
}

module.exports = JsonReporter
