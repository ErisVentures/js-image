# exif
[![NPM Package](https://img.shields.io/badge/npm-@ouranos/exif-brightgreen.svg)](https://www.npmjs.com/package/@ouranos/exif)
[![Build Status](https://travis-ci.org/ouranos-oss/js-exif.svg?branch=master)](https://travis-ci.org/ouranos-oss/js-exif)
[![Coverage Status](https://coveralls.io/repos/github/ouranos-oss/js-exif/badge.svg?branch=master)](https://coveralls.io/github/ouranos-oss/js-exif?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Dependencies](https://david-dm.org/ouranos-oss/js-exif.svg)](https://david-dm.org/ouranos-oss/js-exif)

Parses EXIF data from JPEG and NEF files.

## Usage

`yarn add @ouranos/exif`

### Node

```js
const fs = require('fs')
const parse = require('@ouranos/exif')
const metadata = parse(fs.readFileSync('./myfile.jpg'))
console.log(metadata)
/*
  {
    make: 'NIKON CORPORATION',
    width: 1498,
    createdAt: new Date('2017-03-16T02:25:25.000Z'),
    ...,
    _raw: {
      Make: 'NIKON CORPORATION',
      ImageWidth: 1498,
      DateTimeOriginal: '2017:03:16 02:25:25',
      ...
    }
  }
*/
```