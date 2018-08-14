# exif

[![NPM Package](https://badge.fury.io/js/%40eris%2Fexif.svg)](https://www.npmjs.com/package/@eris/exif)
[![Build Status](https://travis-ci.org/ErisVentures/js-image.svg?branch=master)](https://travis-ci.org/ErisVentures/js-image)
[![Coverage Status](https://coveralls.io/repos/github/ErisVentures/js-image/badge.svg?branch=master)](https://coveralls.io/github/ErisVentures/js-image?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Parses and writes EXIF data from JPEG and NEF files.

## Usage

`yarn add @eris/exif`

### Node

#### Extracting Metadata

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

#### Converting RAW Formats

```js
const fs = require('fs')
const RAWDecoder = require('@eris/exif').Decoder

const myFile = fs.readFileSync('./DSC_0001.nef')
const myFileDecoder = new RAWDecoder(myFile)
const myFileAsJpeg = myFileDecoder.extractJpeg()
const metadata = myFileDecoder.extractMetadata()
fs.writeFileSync('./DSC_0001.jpg', myFileAsJpeg)
console.log(metadata)
// {Make: 'NIKON CORPORATION', Model: 'NIKON D4S', ISO: 160, ...}
```

## Documention and Resources for Various Formats

- [EXIF Specification](http://www.exif.org/Exif2-2.PDF)
- [dcraw.c](www.cybercom.net/~dcoffin/dcraw/dcraw.c)
- [EXIF Spec]()
- [TIFF Format Explainer](http://www.fileformat.info/format/tiff/corion.htm)
- [NEF Explainer](http://lclevy.free.fr/nef/)
- [CR2 Explainer](http://lclevy.free.fr/cr2/)
- [EXIF Tags](http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html)
