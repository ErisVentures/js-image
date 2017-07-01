const babel = require('rollup-plugin-babel')

module.exports = {
  entry: 'lib/index.js',
  sourceMap: true,
  exports: 'named',
  moduleName: '@ouranous/exif',
  plugins: [babel()],
  targets: [
    {dest: 'dist/bundle.js', format: 'umd'},
    {dest: 'dist/bundle.cjs.js', format: 'cjs'},
  ],
}
