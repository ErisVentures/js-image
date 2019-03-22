#!/usr/bin/env node

import * as path from 'path'
import * as fs from 'fs'
import {readAllFrom} from '../lib/config-entry'
import {from} from '../lib/reporters'
import {Runner} from '../lib/runner'

const yargs = require('yargs') // tslint:disable-line

const PRESETS = fs
  .readdirSync(path.join(__dirname, '../../presets'))
  .map(p => p.replace('.json', ''))

const argv = yargs
  .usage('Usage: $0 -c [config]')
  .option('mode', {
    type: 'string',
    default: 'constrained',
    choices: ['freeform', 'constrained'],
  })
  .option('config', {
    alias: 'c',
    type: 'string',
    required: true,
  })
  .option('force', {
    type: 'boolean',
  })
  .option('reporter', {
    alias: 'r',
    default: 'pretty',
    choices: ['json', 'pretty'],
  }).argv

async function runFreeform(): Promise<void> {
  try {
    const imageModules = {
      '@eris/image': require('@eris/image'), // tslint:disable-line
      sharp: require('sharp'), // tslint:disable-line
    }

    const unsafeGlobal = global as any
    unsafeGlobal['@eris/image-cli'] = imageModules

    const freeformModule = require(path.resolve(process.cwd(), argv.config))
    let freeformFn: undefined | ((...args: any[]) => Promise<void>)
    if (typeof freeformModule === 'function') freeformFn = freeformModule
    if (typeof freeformModule.run === 'function') freeformFn = freeformModule.run
    if (freeformFn) await freeformFn(imageModules, argv)
  } catch (err) {
    process.stderr.write(`Fatal Error: ${err.stack}\n`)
    process.exit(1)
  }
}

function runConstrained(): void {
  if (PRESETS.indexOf(argv.config) >= 0) {
    argv.config = path.join(__dirname, `../../presets/${argv.config}.json`)
  }

  const configEntries = readAllFrom(argv.config)
  const reporter = from(argv)
  const runner = new Runner(reporter, configEntries)
  runner.run(argv._, argv).catch(err => reporter.finished(err))
}

async function run(): Promise<void> {
  switch (argv.mode) {
    case 'freeform':
      runFreeform()
      break
    case 'constrained':
    default:
      runConstrained()
  }
}

run()
