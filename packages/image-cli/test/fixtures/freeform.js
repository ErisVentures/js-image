const fs = require('fs')
const path = require('path')

module.exports = async function(modules, argv) {
  const totalStart = Date.now()
  let start = Date.now()

  const {Image, BrowserImage, ImageResizeFit} = modules['@eris/image']
  const {TIFFDecoder} = modules['@eris/exif']
  const file = argv._[0] || path.join(__dirname, 'sydney.jpg')
  if (TIFFDecoder) console.log('EXIF is passed-through ✓')

  const fileBuffer = fs.readFileSync(file)
  console.log(`${file} read in ${Date.now() - start}ms ✓`)
  start = Date.now()

  await Image.from(fileBuffer).toMetadata()
  console.log(`Metadata processed in ${Date.now() - start}ms ✓`)
  start = Date.now()

  const imageData = await Image.from(fileBuffer).toImageData()
  console.log(`Image data read in ${Date.now() - start}ms ✓`)
  start = Date.now()

  const size = Math.round(Math.min(imageData.height, imageData.width) / 6)
  const image = BrowserImage.from(imageData)
  const subselect = {top: 0, bottom: size, left: 0, right: size}

  for (let i = 0; i < 5; i++) {
    const start = i * size
    image.resize({
      width: size,
      height: size,
      subselect: {...subselect, top: start, bottom: start + size},
    })

    console.log('Processing', i + 1, '...')
    const selectedImageData = await image.toImageData()
    await Image.from(selectedImageData).analyze({faces: {}, objects: {}}).toAnalysis()
    const buffer = await Image.from(selectedImageData).toBuffer()
    fs.writeFileSync(path.join(__dirname, `actual-freeform-${i}.jpg`), buffer)
  }

  console.log(`Subslices processed in ${Date.now() - start}ms ✓`)

  const faceStart = Date.now()
  console.log('Running face analysis...')
  const analysis = await Image.from(fs.readFileSync(file))
    .resize({fit: ImageResizeFit.Contain, doNotEnlarge: true, width: 1000, height: 1000})
    .analyze({
      faces: {},
      objects: {},
      sharpness: {},
    })
    .toAnalysis()
  console.log(`${analysis.faces.length} faces, ${analysis.objects.length} objects`)
  console.log(`Face analysis took ${Date.now() - faceStart}ms!`)

  console.log(`Done! Took ${Date.now() - totalStart}ms!`)
}
