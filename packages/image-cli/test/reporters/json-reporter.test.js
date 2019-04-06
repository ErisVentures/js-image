const Reporter = require('../../dist/lib/reporters/json-reporter').JsonReporter

describe('lib/reporters/json-reporter.js', () => {
  let reporter, logStub

  beforeEach(() => {
    reporter = new Reporter()
    logStub = reporter._log = jest.fn()
  })

  it('should log the lifecycle', () => {
    reporter.started()
    reporter.finished()

    const startedArg = logStub.mock.calls[0][0]
    expect(startedArg).toHaveProperty('type', 'started')

    const finishedArg = logStub.mock.calls[1][0]
    expect(finishedArg).toHaveProperty('type', 'finished')
    expect(finishedArg).toHaveProperty('data.timeTaken')
  })

  it('should log the entry lifecycle', () => {
    reporter.entryStarted({id: 1, input: 'file'})
    reporter.entryFinished({id: 1, input: 'file', output: 'file2'}, 'result')

    const startedArg = logStub.mock.calls[0][0]
    expect(startedArg).toHaveProperty('type', 'entryStarted')
    expect(startedArg.data).toMatchObject({id: 1, input: 'file'})

    const finishedArg = logStub.mock.calls[1][0]
    expect(finishedArg).toHaveProperty('type', 'entryFinished')
    expect(finishedArg.data).toMatchObject({id: 1, input: 'file', output: 'file2'})
  })

  it('should log the entry lifecycle w/result', () => {
    reporter.entryStarted({id: 1, input: 'file'})
    reporter.entryFinished({
      id: 1,
      input: 'file',
      output: 'file2',
      toReporter: true,
    }, 'result')

    const finishedArg = logStub.mock.calls[1][0]
    expect(finishedArg).toHaveProperty('type', 'entryFinished')
    expect(finishedArg.data).toMatchObject({
      id: 1,
      input: 'file',
      output: 'file2',
      result: 'result',
    })
  })

  it('should log the entry lifecycle w/error', () => {
    reporter.entryStarted({id: 1, input: 'file'})
    reporter.entryErrored({id: 1, input: 'file'}, new Error('wtf'))

    const erroredArg = logStub.mock.calls[1][0]
    expect(erroredArg).toHaveProperty('type', 'entryErrored')
    expect(erroredArg.data).toMatchObject({
      id: 1,
      input: 'file',
    })
    expect(erroredArg.data.error).toMatchObject({message: 'wtf'})
  })
})
