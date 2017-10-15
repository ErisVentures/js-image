const expect = require('chai').expect
const sinon = require('sinon')
const Reporter = require('../../lib/reporters/json-reporter')

describe('lib/reporters/json-reporter.js', () => {
  let sandbox, reporter, logStub
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    reporter = new Reporter()
    logStub = sinon.stub(reporter, '_log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should log the lifecycle', () => {
    reporter.started()
    reporter.finished()

    const startedArg = logStub.firstCall.args[0]
    expect(startedArg).to.have.property('type', 'started')

    const finishedArg = logStub.secondCall.args[0]
    expect(finishedArg).to.have.property('type', 'finished')
    expect(finishedArg).to.have.nested.property('data.timeTaken')
  })

  it('should log the entry lifecycle', () => {
    reporter.entryStarted({id: 1, input: 'file'})
    reporter.entryFinished({id: 1, input: 'file', output: 'file2'}, 'result')

    const startedArg = logStub.firstCall.args[0]
    expect(startedArg).to.have.property('type', 'entryStarted')
    expect(startedArg.data).to.include({id: 1, input: 'file'})

    const finishedArg = logStub.secondCall.args[0]
    expect(finishedArg).to.have.property('type', 'entryFinished')
    expect(finishedArg.data).to.include({id: 1, input: 'file', output: 'file2'})
  })

  it('should log the entry lifecycle w/result', () => {
    reporter.entryStarted({id: 1, input: 'file'})
    reporter.entryFinished({
      id: 1,
      input: 'file',
      output: 'file2',
      toReporter: true,
    }, 'result')

    const finishedArg = logStub.secondCall.args[0]
    expect(finishedArg).to.have.property('type', 'entryFinished')
    expect(finishedArg.data).to.include({
      id: 1,
      input: 'file',
      output: 'file2',
      result: 'result',
    })
  })

  it('should log the entry lifecycle w/error', () => {
    reporter.entryStarted({id: 1, input: 'file'})
    reporter.entryErrored({id: 1, input: 'file'}, new Error('wtf'))

    const erroredArg = logStub.secondCall.args[0]
    expect(erroredArg).to.have.property('type', 'entryErrored')
    expect(erroredArg.data).to.include({
      id: 1,
      input: 'file',
      message: 'wtf',
    })
  })
})
