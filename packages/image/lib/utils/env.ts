/* tslint:disable strict-type-predicates */
let _global: any

function getGlobal(): any {
  if (_global) return _global
  if (typeof window !== 'undefined') _global = window as any
  if (typeof self !== 'undefined') _global = self as any
  if (typeof global !== 'undefined') _global = global as any
  return _global
}

export function hasWASM(): boolean {
  const global = getGlobal()
  return Boolean(global['@eris/image-wasm'] && global['@eris/image-wasm'].wasmModule)
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

export function isNode(): boolean {
  return !isBrowser()
}

export function getWASM(): any {
  return getGlobal()['@eris/image-wasm']
}
