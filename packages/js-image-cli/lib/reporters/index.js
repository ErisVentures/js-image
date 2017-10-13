const PrettyReporter = require('./pretty-reporter')

module.exports = {
  from() {
    return new PrettyReporter()
  },
}
