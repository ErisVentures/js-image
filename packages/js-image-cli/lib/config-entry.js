const fs = require('fs')

const REQUIRED_PROPERTIES = ['input', 'output', 'action']

class ConfigEntry {
  constructor(config) {
    if (!config) {
      throw new Error('config is not defined')
    }

    for (const prop of REQUIRED_PROPERTIES) {
      if (!config[prop]) {
        throw new Error(`config.${prop} is not defined`)
      }
    }

    this._entry = config
  }

  get id() {
    return this._entry.id
  }

  get input() {
    return this._entry.input
  }

  get output() {
    return this._entry.output
  }

  get action() {
    return this._entry.action
  }

  get settings() {
    return this._entry.settings || {}
  }

  get toDisk() {
    return Boolean(this._entry.toDisk)
  }

  get toReporter() {
    return Boolean(this._entry.toReporter)
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
      config.id = index
      return new ConfigEntry(config)
    })
  }
}

module.exports = ConfigEntry
