# raw-decoder

[![NPM Package](https://badge.fury.io/js/raw-decoder.svg)](https://www.npmjs.com/package/raw-decoder)
[![Build Status](https://travis-ci.org/ErisVentures/js-image.svg?branch=master)](https://travis-ci.org/ErisVentures/js-image)
[![Coverage Status](https://coveralls.io/repos/github/ErisVentures/js-image/badge.svg?branch=master)](https://coveralls.io/github/ErisVentures/js-image?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Decodes data from RAW camera files.

## Usage

`yarn add raw-decoder`

### Node

```js
const fs = require('fs')
const RAWDecoder = require('raw-decoder').Decoder

const myFile = fs.readFileSync('./DSC_0001.nef')
const myFileDecoder = new RAWDecoder(myFile)
const myFileAsJpeg = myFileDecoder.extractJpeg()
const metadata = myFileDecoder.extractMetadata()
fs.writeFileSync('./DSC_0001.jpg', myFileAsJpeg)
console.log(metadata)
// {Make: 'NIKON CORPORATION', Model: 'NIKON D4S', ISO: 160, ...}
```

## Documention and Resources for Various Formats

- [dcraw.c](www.cybercom.net/~dcoffin/dcraw/dcraw.c)
- [TIFF Format Explainer](http://www.fileformat.info/format/tiff/corion.htm)
- [NEF Explainer](http://lclevy.free.fr/nef/)
- [CR2 Explainer](http://lclevy.free.fr/cr2/)
- [EXIF Tags](http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html)
