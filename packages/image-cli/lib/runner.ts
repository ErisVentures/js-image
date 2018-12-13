import * as fs from 'fs'
import * as path from 'path'
import * as _ from 'lodash'
import {Image} from '@eris/image'
import {IReporter} from './reporters/reporter'
import {IConfigEntry} from './config-entry'

interface IRunnerFile {
  path: string
  pathWithoutExtension: string
  dirname: string
  basename: string
  basenameWithoutExtension: string
  extension: string
}

interface IRunnerContext {
  file: IRunnerFile
  cwd: string
  force: boolean
}

export interface IRunOptions {
  force?: boolean
}

export class Runner {
  private readonly _reporter: IReporter
  private readonly _entries: IConfigEntry[]
  private readonly _cachedFiles: Map<string, Buffer>

  public constructor(reporter: IReporter, configEntries: IConfigEntry[]) {
    this._reporter = reporter
    this._entries = configEntries
    this._cachedFiles = new Map()
  }

  private _checkForNecessaryFiles(filePaths: string[]): void {
    if (filePaths.length) return

    for (const entry of this._entries) {
      if (entry.input.includes('<%= file') || entry.output.includes('<%= file')) {
        throw new Error('Entry demanded a file but none provided')
      }
    }
  }

  private _fileExistsInCacheOrDisk(filePath: string): boolean {
    return this._cachedFiles.has(filePath) || fs.existsSync(filePath)
  }

  private _getBufferFromCacheOrDisk(filePath: string): Buffer {
    if (this._cachedFiles.has(filePath)) {
      return this._cachedFiles.get(filePath)!
    }

    return fs.readFileSync(filePath)
  }

  private _processCachedEntry(entry: IConfigEntry): void {
    let result
    if (entry.action === 'toBuffer') {
      const buffer = this._getBufferFromCacheOrDisk(entry.output)
      result = buffer
      this._cachedFiles.set(entry.output, buffer)
    } else if (entry.action === 'toAnalysis' || entry.action === 'toMetadata') {
      const contents = fs.readFileSync(entry.output, 'utf8')
      result = JSON.parse(contents)
    } else if (!entry.action) {
      result = this._getBufferFromCacheOrDisk(entry.input)
    } else {
      throw new Error(`Unrecognized action "${entry.action}"`)
    }

    this._reporter.entryFinished(entry, result)
  }

  private async _processEntry(entry: IConfigEntry, context: IRunnerContext): Promise<void> {
    entry = _.clone(entry)
    entry.force = Boolean(entry.force || context.force)
    entry.input = _.template(entry.input)(context)
    entry.output = _.template(entry.output)(context)

    this._reporter.entryStarted(entry)
    if (this._fileExistsInCacheOrDisk(entry.output) && !entry.force) {
      return this._processCachedEntry(entry)
    }

    const input = this._getBufferFromCacheOrDisk(entry.input)

    const image = Image.from(input).options(entry.settings)
    const result = entry.action ? await image[entry.action]() : input
    let toDiskResult: Buffer | string = result as Buffer

    if (Buffer.isBuffer(result)) {
      this._cachedFiles.set(entry.output, result)
    } else {
      toDiskResult = JSON.stringify(result, null, 2)
    }

    if (entry.toDisk) {
      fs.writeFileSync(entry.output, toDiskResult)
    }

    this._reporter.entryFinished(entry, result)
  }

  public async run(filePaths: string[] = [], options?: IRunOptions): Promise<void> {
    this._reporter.started()
    this._checkForNecessaryFiles(filePaths)

    const force = Boolean((options && options.force) || process.env.FORCE)
    const cwd = process.cwd()
    if (!filePaths.length) {
      filePaths = ['/dev/null']
    }

    for (const filePath of filePaths) {
      const fullPath = path.resolve(cwd, filePath)
      const extension = path.extname(fullPath)

      const file = {
        path: fullPath,
        pathWithoutExtension: fullPath.slice(0, -1 * extension.length),
        dirname: path.dirname(fullPath),
        basename: path.basename(fullPath),
        basenameWithoutExtension: path.basename(fullPath, extension),
        extension,
      }

      for (const entry of this._entries) {
        try {
          await this._processEntry(entry, {file, cwd, force})
        } catch (err) {
          this._reporter.entryErrored(entry, err)
        }
      }
    }

    this._reporter.finished()
  }
}
