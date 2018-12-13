import {IConfigEntry} from '../config-entry'

export interface IReporter {
  started(): void
  finished(err?: Error): void
  entryStarted(config: IConfigEntry): void
  entryFinished(config: IConfigEntry, result?: any): void
  entryErrored(config: IConfigEntry, err: Error): void
}
