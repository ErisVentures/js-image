const PrettyReporter = require('./pretty-reporter')
const JsonReporter = require('./json-reporter')

module.exports = {
  from(options) {
    return options.reporter === 'pretty' ?
      new PrettyReporter() :
      new JsonReporter()
  },
}
