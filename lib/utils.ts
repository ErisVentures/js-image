/* tslint:disable */
export type Callback = (err: Error|undefined, ...results: any[]) => void

export function promisify(func: (...args: any[]) => void): (...args: any[]) => Promise<any> {
  return (...args) => new Promise((resolve, reject) => {
    const callback: Callback = (err, ...results) => {
      if (err) {
        reject(err)
      } else if (results.length === 1) {
        resolve(results[0])
      } else {
        resolve(results)
      }
    }

    func.apply(undefined, args.concat(callback))
  })
}
