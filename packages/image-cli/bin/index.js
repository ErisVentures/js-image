#!/usr/bin/env node

const yargs = require('yargs')
const ConfigEntry = require('../lib/config-entry')
const Runner = require('../lib/runner')
const Reporters = require('../lib/reporters')

const argv = yargs
  .usage('Usage: $0 -c [config]')
  .option('config', {
    alias: 'c',
    type: 'string',
    required: true,
  })
  .option('reporter', {
    alias: 'r',
    default: 'pretty',
    choices: ['json', 'pretty'],
  })
  .argv

const configEntries = ConfigEntry.readAllFrom(argv.config)
const reporter = Reporters.from(argv)
const runner = new Runner(reporter, configEntries)
runner.run(argv._).catch(err => reporter.finished(err))
