import {IConfigEntry} from '../config-entry'
import {IReporter} from './reporter'

/* tslint:disable no-console */

export class PrettyReporter implements IReporter {
  private _startTime: number

  public started(): void {
    this._startTime = Date.now()
    console.log('📸  image-cli is starting up')
  }

  public finished(err?: Error): void {
    const finish = Date.now() - this._startTime
    if (err) {
      console.log(`X  image-cli has fatally errored after ${finish} ms`)
      console.log(err.stack)
    } else {
      console.log(`🏁  image-cli has finished in ${finish} ms`)
    }
  }

  public entryStarted(config: IConfigEntry): void {
    console.log(`  ⏳   starting to work on ${config.id}:${config.input}`)
  }

  public entryFinished(config: IConfigEntry): void {
    console.log(`  ✅   completed work on ${config.id}:${config.input}`)
  }

  public entryErrored(config: IConfigEntry, err: Error): void {
    console.log(`  🛑   errored on ${config.input}`)
    console.error(err)
  }
}
