import {IReporter} from './reporter'
import {PrettyReporter} from './pretty-reporter'
import {JsonReporter} from './json-reporter'

export function from(options: {reporter?: 'json' | 'pretty'}): IReporter {
  return options.reporter === 'pretty' ? new PrettyReporter() : new JsonReporter()
}
