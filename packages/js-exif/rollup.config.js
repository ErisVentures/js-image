const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')

module.exports = {
  entry: 'lib/index.js',
  sourceMap: true,
  exports: 'named',
  moduleName: '@ouranous/exif',
  plugins: [babel(), resolve({jsnext: true, main: true}), commonjs()],
  targets: [
    {dest: 'dist/bundle.js', format: 'umd'},
    {dest: 'dist/bundle.cjs.js', format: 'cjs'},
  ],
}
