/* eslint-disable no-console */

class PrettyReporter {
  started() {
    this._startTime = Date.now()
    console.log('📸  image-cli is starting up')
  }

  finished() {
    const finish = Date.now() - this._startTime
    console.log(`🏁  image-cli has finished in ${finish} ms`)
  }

  entryStarted(config) {
    console.log(`  ⏳   starting to work on ${config.id}:${config.input}`)
  }

  entryFinished(config) {
    console.log(`  ✅   completed work on ${config.id}:${config.input}`)
  }

  entryErrored(config, err) {
    console.log(`  🛑   errored on ${config.input}`)
    console.error(err)
  }
}

module.exports = PrettyReporter
