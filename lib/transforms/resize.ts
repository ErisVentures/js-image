import {IResizeOptions} from '../types'
import {ImageData} from '../image-data'

export function nearestNeighbor(imageData: ImageData, options: IResizeOptions) {
  if (!imageData.width || !imageData.height) {
    throw new Error('Missing width or height');
  }

  const targetWidth = options.width!;
  const targetHeight = options.height!;
  const scaleFactor = imageData.width / targetWidth;
  const scaledHeight = Math.floor(imageData.height / scaleFactor);
  if (targetHeight !== scaledHeight) {
    throw new Error('Can only resize exactly');
  }

  const outPixels = new Uint8Array(targetWidth * targetHeight * imageData.channels);

  for (let i = 0; i < targetWidth; i++) {
    for (let j = 0; j < targetHeight; j++) {
      const origX = Math.floor(i * scaleFactor);
      const origY = Math.floor(j * scaleFactor);

      const origPos = (origY * imageData.width + origX) * imageData.channels;
      const outPos = (j * targetWidth + i) * imageData.channels;

      for (let channel = 0; channel < imageData.channels; channel++) {
        outPixels[outPos + channel] = imageData.data[origPos + channel];
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: outPixels,
    channels: imageData.channels,
    format: imageData.format,
  };
}
