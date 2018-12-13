import * as path from 'path'
import {spawn, ChildProcess} from 'child_process'
import * as EventEmitter from 'events'
import {IConfigEntry} from './config-entry'
import {
  IJsonReporterEntryFinishedLog,
  IJsonReporterEntryErroredLog,
} from './reporters/json-reporter'

export type IEntryResult =
  | IJsonReporterEntryFinishedLog['data']
  | IJsonReporterEntryErroredLog['data']

export interface ICLIClientOptions {
  executablePath: string
}

export interface ICLIWaitForExitOptions {
  failLoudly?: boolean
}

export class CLIInstance extends EventEmitter {
  private _finished: boolean
  private _error: Error | null
  private readonly _entries: IEntryResult[]
  private _stdout: string
  private _stderr: string
  private readonly _childProcess: ChildProcess

  public constructor(cmd: string, args: string[]) {
    super()
    this._finished = false
    this._error = null
    this._entries = []
    this._stdout = ''
    this._stderr = ''

    try {
      this._childProcess = spawn(cmd, args)
      this._listenToProcessEvents()
    } catch (err) {
      this._emitDone(err)
    }
  }

  private _emitDone(err?: Error): void {
    this._finished = true
    if (err) {
      this._error = err
      this.emit('done', {failed: true, err})
    } else {
      this.emit('done', {failed: true, entries: this._entries})
    }
  }

  private _processChunk(chunk: string | Buffer): void {
    const stringChunk = chunk.toString()
    this._stdout += stringChunk

    const lines = stringChunk.toString().split('\n')
    lines.forEach(line => {
      if (!line) {
        return
      }

      try {
        const message = JSON.parse(line)
        if (message.type === 'entryFinished') {
          this._entries.push(message.data)
        } else if (message.type === 'entryErrored') {
          this._entries.push(message.data)
        }
      } catch (err) {
        this.emit('error', err)
      }
    })
  }

  private _listenToProcessEvents(): void {
    this._childProcess.stdout.on('data', chunk => this._processChunk(chunk))
    this._childProcess.stderr.on('data', s => (this._stderr += s))
    this._childProcess.on('error', err => this._emitDone(err))
    this._childProcess.on('exit', code => {
      if (code === 0) {
        this._emitDone()
      } else {
        const err = new Error(`Process exited with exit code ${code}`) as any
        err.stdout = this._stdout
        err.stderr = this._stderr
        this._emitDone(err)
      }
    })
  }

  private async _entriesToPromise(options: ICLIWaitForExitOptions = {}): Promise<IEntryResult[]> {
    const failedEntry = this._entries.find(entry => !!(entry as any).error) as
      | IJsonReporterEntryErroredLog['data']
      | null
    if (options.failLoudly && failedEntry && failedEntry.error) {
      const error = new Error(failedEntry.error.message) as any
      error.originalStack = failedEntry.error.stack
      throw error
    }

    return this._entries
  }

  public async waitForExit(options?: ICLIWaitForExitOptions): Promise<IEntryResult[]> {
    if (this._finished) {
      if (this._error) throw this._error
      return this._entriesToPromise(options)
    }

    await new Promise<{}>(resolve => this.once('done', resolve))
    return this.waitForExit(options)
  }
}

export class CLIClient {
  private readonly _options: ICLIClientOptions

  public constructor(options: Partial<ICLIClientOptions>) {
    this._options = {
      executablePath: path.join(__dirname, '../../bin/run.js'),
      ...options,
    }
  }

  public run(config: string | IConfigEntry | IConfigEntry[]): CLIInstance {
    const args = [
      '-c',
      typeof config === 'string' ? config : JSON.stringify(config),
      '--reporter=json',
    ]

    return new CLIInstance(this._options.executablePath, args)
  }
}
