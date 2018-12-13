import {IConfigEntry} from '../config-entry'
import {IReporter} from './reporter'

export class JsonReporter implements IReporter {
  private _startTime: number
  private readonly _entryStartTimes: Map<number, number>

  public constructor() {
    this._startTime = 0
    this._entryStartTimes = new Map()
  }

  // TODO: type this log message
  public _log(obj: any): void {
    console.log(JSON.stringify(obj)) // tslint:disable-line no-console
  }

  public started(): void {
    this._startTime = Date.now()
    this._log({type: 'started', data: {}})
  }

  public finished(err?: Error): void {
    const errPayload = err && {message: err.message, stack: err.stack}
    const timeTaken = Date.now() - this._startTime
    this._log({type: 'finished', data: {timeTaken}, err: errPayload})
  }

  public entryStarted(config: IConfigEntry): void {
    this._entryStartTimes.set(config.id, Date.now())

    const id = config.id
    const input = config.input
    const data = {id, input}
    this._log({type: 'entryStarted', data})
  }

  public entryFinished(config: IConfigEntry, result?: any): void {
    const id = config.id
    const input = config.input
    const output = config.output
    const timeTaken = Date.now() - (this._entryStartTimes.get(id) || 0)
    const data = {id, input, output, timeTaken, result}
    if (!config.toReporter) {
      delete data.result
    }

    this._log({type: 'entryFinished', data})
  }

  public entryErrored(config: IConfigEntry, err: Error): void {
    const id = config.id
    const input = config.input
    const timeTaken = Date.now() - (this._entryStartTimes.get(id) || 0)
    const message = err.message
    const stack = err.stack
    const data = {id, input, timeTaken, message, stack}
    this._log({type: 'entryErrored', data})
  }
}
