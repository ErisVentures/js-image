#!/usr/bin/env node

import * as path from 'path'
import * as fs from 'fs'
import {readAllFrom} from '../lib/config-entry'
import {from} from '../lib/reporters'
import {Runner} from '../lib/runner'

const yargs = require('yargs') // tslint:disable-line

const PRESETS = fs.readdirSync(path.join(__dirname, '../../presets')).map(p => p.replace('.json', ''))

const argv = yargs
  .usage('Usage: $0 -c [config]')
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

if (PRESETS.indexOf(argv.config) >= 0) {
  argv.config = path.join(__dirname, `../../presets/${argv.config}.json`)
}

const configEntries = readAllFrom(argv.config)
const reporter = from(argv)
const runner = new Runner(reporter, configEntries)
runner.run(argv._, argv).catch(err => reporter.finished(err))
