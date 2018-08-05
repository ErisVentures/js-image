const fs = require('fs')

const REQUIRED_PROPERTIES = ['input', 'output', 'action']

class ConfigEntry {
  constructor(config) {
    for (const prop of REQUIRED_PROPERTIES) {
      if (!config[prop]) {
        throw new Error(`config.${prop} is not defined`)
      }
    }

    this._entry = config

    return {
      id: config.id,
      input: config.input || '<%= file.path %>',
      output: config.output,
      action: config.action,
      settings: config.settings || {},
      force: Boolean(config.force),
      toDisk: Boolean(config.toDisk),
      toReporter: Boolean(config.toReporter),
    }
  }

  static readAllFrom(pathOrConfig) {
    let json
    if (typeof pathOrConfig === 'object') {
      json = pathOrConfig
    } else if (pathOrConfig.charAt(0) === '{' || pathOrConfig.charAt(0) === '[') {
      json = JSON.parse(pathOrConfig)
    } else {
      json = JSON.parse(fs.readFileSync(pathOrConfig, 'utf8'))
    }

    if (!Array.isArray(json)) {
      json = [json]
    }

    return json.map((config, index) => {
      if (!config) {
        throw new Error('config is not defined')
      }

      config.id = index
      return new ConfigEntry(config)
    })
  }
}

module.exports = ConfigEntry
