import * as fs from 'fs'
import {IAllImageOptions} from '@eris/image/dist/types'

export interface IConfigEntry {
  id: number
  input: string
  output: string
  action?: 'toBuffer' | 'toAnalysis' | 'toMetadata'
  force: boolean
  toDisk: boolean
  toReporter: boolean
  settings: IAllImageOptions
}

const REQUIRED_PROPERTIES = ['input', 'output']

function fromUnsafe(config: any): IConfigEntry {
  // TODO: check that more of the props actually conform
  for (const prop of REQUIRED_PROPERTIES) {
    if (!config[prop]) {
      throw new Error(`config.${prop} is not defined`)
    }
  }

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

export function readAllFrom(pathOrConfig: string | IConfigEntry | IConfigEntry[]): IConfigEntry[] {
  let json: IConfigEntry | IConfigEntry[]
  if (typeof pathOrConfig === 'object') {
    json = pathOrConfig
  } else if (pathOrConfig.charAt(0) === '{' || pathOrConfig.charAt(0) === '[') {
    json = JSON.parse(pathOrConfig)
  } else {
    json = JSON.parse(fs.readFileSync(pathOrConfig, 'utf8'))
  }

  const jsonAsArray = Array.isArray(json) ? json : [json]
  return jsonAsArray.map((config, index) => {
    if (!config) {
      throw new Error('config is not defined')
    }

    config.id = index
    return fromUnsafe(config)
  })
}
