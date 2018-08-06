#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const ConfigEntry = require('../lib/config-entry')
const Runner = require('../lib/runner')
const Reporters = require('../lib/reporters')

const PRESETS = fs.readdirSync(path.join(__dirname, '../presets')).map(p => p.replace('.json', ''))

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

if (PRESETS.includes(argv.config)) {
  argv.config = path.join(__dirname, `../presets/${argv.config}.json`)
}

const configEntries = ConfigEntry.readAllFrom(argv.config)
const reporter = Reporters.from(argv)
const runner = new Runner(reporter, configEntries)
runner.run(argv._, argv).catch(err => reporter.finished(err))
