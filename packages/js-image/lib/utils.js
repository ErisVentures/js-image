module.exports = {
  promisify(func, context) {
    return (...args) => new Promise((resolve, reject) => {
      const callback = function (err, ...results) {
        if (err) {
          reject(err)
        } else if (results.length === 1) {
          resolve(results[0])
        } else {
          resolve(results)
        }
      }

      func.apply(context, args.concat(callback))
    })
  },
}
