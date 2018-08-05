/* eslint-disable no-console */

class PrettyReporter {
  started() {
    this._startTime = Date.now()
    console.log('📸  image-cli is starting up')
  }

  finished(err) {
    const finish = Date.now() - this._startTime
    if (err) {
      console.log(`X  image-cli has fatally errored after ${finish} ms`)
      console.log(err.stack)
    } else {
      console.log(`🏁  image-cli has finished in ${finish} ms`)
    }
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
