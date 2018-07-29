// tslint:disable
module.exports = function createNoopFunc(file: string): (args: any[]) => void {
  return function() {}
}
