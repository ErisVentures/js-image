export interface IMethodHookParams {
  invocationId: number
  name: string
  args: any[]
}

export type MethodHookFn = (params: IMethodHookParams) => void

let invocationId: number = 0

export const instrumentation = {
  onMethodStart: [] as MethodHookFn[],
  onMethodComplete: [] as MethodHookFn[],
  wrapMethod,
  wrapAllMethods(o: any): void {
    // tslint:disable-next-line
    for (const name of Object.getOwnPropertyNames(o)) {
      if (typeof o[name] !== 'function') continue
      o[name] = wrapMethod<any[], any>(name, o[name])
    }
  },
}

function runMethods(id: number, name: string, args: any[], hooks: MethodHookFn[]): void {
  for (const fn of hooks) {
    fn({invocationId: id, name, args})
  }
}

function wrapMethod<TArgs extends any[], TOutput>(
  name: string,
  fn: (...args: TArgs) => TOutput,
): (...args: TArgs) => TOutput {
  return function(this: any, ...args: any[]): any {
    invocationId++
    runMethods(invocationId, name, args, instrumentation.onMethodStart)

    let retVal = fn.apply(this, args)
    if (retVal && typeof retVal.then === 'function') {
      retVal = retVal
        .then((value: any) => {
          runMethods(invocationId, name, args, instrumentation.onMethodComplete)
          return value
        })
        .catch((err: Error) => {
          runMethods(invocationId, name, args, instrumentation.onMethodComplete)
          throw err
        })
    } else {
      runMethods(invocationId, name, args, instrumentation.onMethodComplete)
    }

    return retVal
  }
}
