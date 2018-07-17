# exif

[![NPM Package](https://badge.fury.io/js/%40eris%2Fexif.svg)](https://www.npmjs.com/package/@eris/exif)
[![Build Status](https://travis-ci.org/ErisVentures/js-image.svg?branch=master)](https://travis-ci.org/ErisVentures/js-image)
[![Coverage Status](https://coveralls.io/repos/github/ErisVentures/js-image/badge.svg?branch=master)](https://coveralls.io/github/ErisVentures/js-image?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Parses EXIF data from JPEG and NEF files.

## Usage

`yarn add @eris/exif`

### Node

```js
const fs = require('fs')
const parse = require('@eris/exif')
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
