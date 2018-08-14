import {ILogger} from './types'

const debug = require('debug') // tslint:disable-line

export function createLogger(namespace: string): ILogger {
  namespace = `exif:${namespace}`
  const log = debug(namespace)
  const verbose = debug(`${namespace}:verbose`)
  log.verbose = verbose
  return log
}
