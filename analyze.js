const BrowserImage = window['@eris/image'].Image
const ImageData = window['@eris/image'].ImageData

const IMAGE_A = '../test/fixtures/actual-rainbow2.jpg'
const IMAGE_B = '../test/fixtures/actual-lr-blue-saturation.jpg'

async function imageDataFromURL(url) {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const image = BrowserImage.from(new Uint8Array(arrayBuffer))
  return await image.toImageData()
}

async function getColumn(imageData, position = 0) {
  const image = BrowserImage.from(imageData)
  return await image
    .resize({
      width: 1,
      height: imageData.height,
      fit: 'exact',
      subselect: {top: 0, bottom: imageData.height, left: position, right: position + 1},
    })
    .toImageData()
}

function graphDatasets(transform, imageDataA, imageDataB, datasetInfo) {
  const transformedA = transform(imageDataA)
  const transformedB = transform(imageDataB)

  const datasets = datasetInfo.map(item => ({label: item.label, data: []}))

  for (let i = 0; i < transformedA.height; i++) {
    const offset = i * datasets.length
    for (let c = 0; c < datasets.length; c++) {
      datasets[c].data.push({
        x: Math.round(360 - 360 * i / 255),
        y: transformedB.data[offset + c] - transformedA.data[offset + c],
      })
    }
  }

  for (let c = 0; c < datasets.length; c++) {
    new Chart(document.getElementById(datasetInfo[c].id), {
      type: 'line',
      data: {datasets: [datasets[c]]},
      options: {
        scales: {
          yAxes: [
            {
              type: 'linear',
              position: 'left',
              ticks: {min: -1, max: 1, ...(datasetInfo[c].yAxis || {})},
            },
          ],
          xAxes: [{type: 'linear', position: 'bottom', ticks: {min: 0, max: 360, stepSize: 45}}],
        },
      },
    })
  }
}

function graphRGBDatasets(imageDataA, imageDataB) {
  const transformedA = ImageData.toRGB(imageDataA)
  const transformedB = ImageData.toRGB(imageDataB)

  const datasets = [
    {label: 'R', data: []},
    {label: 'G', data: []},
    {label: 'B', data: []},
  ]

  for (let i = 0; i < transformedA.height; i++) {
    const offset = i * datasets.length
    for (let c = 0; c < datasets.length; c++) {
      datasets[c].data.push({
        x: transformedA.data[offset + c],
        y: transformedB.data[offset + c] - transformedA.data[offset + c],
      })
    }
  }

  for (const {data} of datasets) {
    data.sort((a, b) => a.x - b.x)
  }

  for (let c = 0; c < datasets.length; c++) {
    new Chart(document.getElementById(`rgb2-${datasets[c].label}`), {
      type: 'scatter',
      data: {datasets: [datasets[c]]},
      options: {
        scales: {
          yAxes: [
            {
              type: 'linear',
              position: 'left',
              ticks: {min: -255, max: 255},
            },
          ],
          xAxes: [{type: 'linear', position: 'bottom', ticks: {min: 0, max: 255, stepSize: 32}}],
        },
      },
    })
  }
}

function showImages() {
  document.getElementById('img1').src = IMAGE_A
  document.getElementById('img2').src = IMAGE_B
}

async function graphAtColumn(imageA, imageB, position) {
  const columnA = await getColumn(imageA, position)
  const columnB = await getColumn(imageB, position)

  graphDatasets(ImageData.toHSL, columnA, columnB, [
    {label: 'Hue', id: 'hsl-h', yAxis: {min: -60, max: 60}},
    {label: 'Saturation', id: 'hsl-s'},
    {label: 'Lightness', id: 'hsl-l'},
  ])

  graphDatasets(ImageData.toHCL, columnA, columnB, [
    {label: 'Hue', id: 'hcl-h', yAxis: {min: -60, max: 60}},
    {label: 'Chroma', id: 'hcl-c'},
    {label: 'Luminance', id: 'hcl-l'},
  ])

  graphDatasets(ImageData.toRGB, columnA, columnB, [
    {label: 'R', id: 'rgb-r', yAxis: {min: -255, max: 255}},
    {label: 'G', id: 'rgb-g', yAxis: {min: -255, max: 255}},
    {label: 'B', id: 'rgb-b', yAxis: {min: -255, max: 255}},
  ])

  graphRGBDatasets(columnA, columnB)

  graphDatasets(ImageData.toXYZ, columnA, columnB, [
    {label: 'X', id: 'xyz-x'},
    {label: 'Y', id: 'xyz-y'},
    {label: 'Z', id: 'xyz-z'},
  ])

  graphDatasets(ImageData.toXYY, columnA, columnB, [
    {label: 'x', id: 'xyy-x'},
    {label: 'y', id: 'xyy-y'},
    {label: 'Y', id: 'xyy-yy'},
  ])
}

async function analyzeAndGraphImages() {
  const imageA = await imageDataFromURL(IMAGE_A)
  const imageB = await imageDataFromURL(IMAGE_B)

  await graphAtColumn(imageA, imageB, 0)
}

showImages()
analyzeAndGraphImages()
