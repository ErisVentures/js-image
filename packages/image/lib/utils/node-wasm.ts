import {resolve} from 'path'
import {readFileSync} from 'fs'

export async function registerNodeWASM(): Promise<void> {
  const WebAssembly = (global as any).WebAssembly
  if (typeof WebAssembly === 'undefined') return

  const wasmBytes = readFileSync(resolve(__dirname, '../../dist/bundle.wasm'))
  const wasmModule = await WebAssembly.instantiate(new Uint8Array(wasmBytes), {})
  // @ts-ignore
  global['@eris/image-wasm'] = {wasmModule}
}
