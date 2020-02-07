#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const {parse, createDecoder} = require('../packages/exif/dist/index')

const TARGET_DIR = path.resolve(process.cwd(), process.argv[2])
if (!fs.existsSync(TARGET_DIR)) throw new Error(`${TARGET_DIR} did not exist`)

const files = fs.readdirSync(TARGET_DIR)
for (const file of files) {
  const filePath = path.join(TARGET_DIR, file)
  try {
    const buffer = fs.readFileSync(filePath)
    const metadata = parse(buffer)
    const jpeg = createDecoder(buffer).extractJPEG()
    const jpegMetadata = parse(jpeg)
    console.log(
      '✅',
      file,
      `[${metadata.model}, ${metadata.fNumber}, ${jpegMetadata.width}x${jpegMetadata.height}]`,
    )
  } catch (err) {
    console.log('❌', file, err.message)
  }
}
