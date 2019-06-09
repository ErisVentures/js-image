const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const Bluebird = require('bluebird')
const sharp = require('sharp')

/**
 * This script will resize all the source photos to 100x100, and generate random crops to create photos of rating 20.
 * <input_dir> is assumed to have the following shape.
 *
 * ```
 *  - <input_dir>
 *     - Source
 *        - 0
 *        - X
 *        - 100
 *     - Auto-Generated
 *        - 0
 *        - X
 *        - 100
 * ```
 *
 */
if (process.argv.length !== 3) {
  console.error('USAGE: preprocess-good-photos.js <input_dir>')
  console.error(process.argv)
  process.exit(1)
}

async function resizeTo150(inputFile, outputFile) {
  await sharp(inputFile)
    .rotate()
    .resize(150, 150, {fit: 'fill'})
    .toFile(outputFile)
}

function mkdirp(filePath) {
  if (!fs.existsSync(filePath)) fs.mkdirSync(filePath)
}

async function run() {
  const inputDirPath = path.resolve(process.cwd(), process.argv[2])
  const sourceDirPath = path.join(inputDirPath, 'Source')
  const autogenDirPath = path.join(inputDirPath, 'Auto-Generated')
  if (!fs.existsSync(sourceDirPath)) throw new Error(`Expected ${sourceDirPath} to exist`)

  mkdirp(autogenDirPath)

  const sourceDirRatingFolderPaths = fs
    .readdirSync(sourceDirPath)
    .filter(folder => Number.isFinite(Number(folder)))
    .map(rating => path.join(sourceDirPath, rating))

  for (const ratingFolderPath of sourceDirRatingFolderPaths) {
    const rating = Number(path.basename(ratingFolderPath))
    const autogenRatingFolderPath = path.join(autogenDirPath, rating.toString())
    mkdirp(autogenRatingFolderPath)
    console.log('Processing photos with rating', rating)

    await Bluebird.map(
      fs.readdirSync(ratingFolderPath),
      async file => {
        if (!file.endsWith('.jpg') || file.startsWith('.')) return

        try {
          const inputPath = path.join(ratingFolderPath, file)
          const outputPath = path.join(autogenRatingFolderPath, file)
          if (fs.existsSync(outputPath)) {
            console.log(`${file} already done.`)
            return
          }

          console.log(`Resizing ${file}...`)
          await resizeTo150(inputPath, outputPath)
        } catch (err) {
          console.error(file, 'failed!!!')
          console.error(err.stack)
        }
      },
      {concurrency: require('os').cpus().length},
    )
  }

  console.log('Done!')
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
