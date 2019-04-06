const path = require('path')
const resolve = require('rollup-plugin-node-resolve')
const alias = require('rollup-plugin-alias')
const commonjs = require('rollup-plugin-commonjs')
const babili = require('rollup-plugin-babili')
const sourcemaps = require('rollup-plugin-sourcemaps')

// TODO: add Buffer shim
const emptyshim = path.join(__dirname, 'dist/shims/empty.js')
const debugshim = path.join(__dirname, 'dist/shims/debug.js')
const fsshim = path.join(__dirname, 'dist/shims/fs.js')
const pngshim = path.join(__dirname, 'dist/shims/png-js.js')
const jpegshim = path.join(__dirname, 'dist/shims/jpeg-js.js')

module.exports = {
  entry: 'dist/browser-index.js',
  dest: `dist/bundle.${process.env.MINIFY ? 'min.' : ''}js`,
  moduleName: '@eris/image',
  format: 'umd',
  sourceMap: true,
  exports: 'named',
  plugins: [
    sourcemaps(),
    alias({
      canvas: emptyshim,
      'face-api.js': emptyshim,
      '@tensorflow/tfjs-node': emptyshim,

      debug: debugshim,
      fs: fsshim,
      pngjs: pngshim,
      'jpeg-js': jpegshim,
    }),
    resolve({jsnext: true, main: true}),
    commonjs({}),
    process.env.MINIFY ? babili({sourceMap: true, comments: false}) : {},
  ],
}
