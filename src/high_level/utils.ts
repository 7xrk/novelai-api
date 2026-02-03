import {
  createCanvas,
  ImageData,
  loadImage as _loadImage,
} from "@napi-rs/canvas";

export type Size = Readonly<{
  width: number;
  height: number;
}>;

export async function resizeImage(image: Blob | Uint8Array, size: Size) {
  const bin = image instanceof Blob
    ? new Uint8Array(await image.arrayBuffer())
    : image;
  const img = await loadImage(bin);

  const c = createCanvas(size.width, size.height);
  c.getContext("2d").drawImage(img, 0, 0, size.width, size.height);
  const buffer = c.toBuffer("image/png");

  return new Uint8Array([...buffer]);
}

export function randomInt() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export async function convertToPng(image: Blob | Uint8Array | ImageData) {
  if (image instanceof ImageData) {
    const c = createCanvas(image.width, image.height);
    const x = c.getContext("2d");
    x.putImageData(image, 0, 0);
    const buffer = c.toBuffer("image/png");
    return { buffer, imageSize: { width: image.width, height: image.height } };
  }

  const img = await loadImage(image);

  const size = { width: img.width, height: img.height };
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const buffer = canvas.toBuffer("image/png");
  // canvas.dispose();
  return { buffer, imageSize: size };
}

export async function loadImage(image: Blob | Uint8Array) {
  const bin = image instanceof Blob
    ? new Uint8Array(await image.arrayBuffer())
    : image;
  return await _loadImage(bin);
}

export async function loadImageAsImageData(image: Blob | Uint8Array) {
  const img = await loadImage(image);
  const c = createCanvas(img.width, img.height);
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, img.width, img.height);
}

export function binarizeImage(input: ImageData, blockSize: number): ImageData {
  const imgData = new ImageData(input.data, input.width, input.height);
  const data = imgData.data;

  for (let x = 0; x < imgData.width; x += blockSize) {
    for (let y = 0; y < imgData.height; y += blockSize) {
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        sumA = 0;
      let count = 0;

      for (let dx = 0; dx < blockSize && x + dx < imgData.width; dx++) {
        for (let dy = 0; dy < blockSize && y + dy < imgData.height; dy++) {
          const i = ((y + dy) * imgData.width + (x + dx)) * 4;
          sumR += data[i];
          sumG += data[i + 1];
          sumB += data[i + 2];
          sumA += data[i + 3];
          count++;
        }
      }

      const blockValueR = sumR / count > 127 ? 255 : 0;
      const blockValueG = sumG / count > 127 ? 255 : 0;
      const blockValueB = sumB / count > 127 ? 255 : 0;
      const blockValueA = sumA / count > 127 ? 255 : 0;

      for (let dx = 0; dx < blockSize && x + dx < imgData.width; dx++) {
        for (let dy = 0; dy < blockSize && y + dy < imgData.height; dy++) {
          const i = ((y + dy) * imgData.width + (x + dx)) * 4;
          data[i] = blockValueR;
          data[i + 1] = blockValueG;
          data[i + 2] = blockValueB;
          data[i + 3] = blockValueA;
        }
      }
    }
  }

  return imgData;
}

export function adjustResolution(
  width: number,
  height: number,
  pixels: number,
): [number, number] {
  const currentPixels = width * height;
  const aspectRatio = width / height;
  const targetPixels = Math.min(currentPixels, pixels);

  const newHeight = Math.sqrt(targetPixels / aspectRatio);
  const newWidth = Math.round(newHeight * aspectRatio);

  return [Math.round(newWidth), Math.round(newHeight)];
}

/** for resolution value */
export function nearest64(n: number) {
  return Math.floor(n / 64) * 64;
}
