const path = require('path')
const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const alias = require('rollup-plugin-alias')

module.exports = {
  entry: 'lib/index.js',
  sourceMap: true,
  exports: 'named',
  moduleName: '@ouranous/exif',
  plugins: [
    babel(),
    alias({debug: path.join(__dirname, 'lib/debug-shim.js')}),
    resolve({jsnext: true, main: true}),
    commonjs(),
  ],
  targets: [
    {dest: 'dist/bundle.js', format: 'umd'},
    {dest: 'dist/bundle.cjs.js', format: 'cjs'},
  ],
}
