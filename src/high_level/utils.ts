import { loadImage as _loadImage, createCanvas } from "@napi-rs/canvas";

export type Size = Readonly<{
  width: number;
  height: number;
}>;

export async function resizeImage(image: Blob | Uint8Array, size: Size) {
  const bin =
    image instanceof Blob ? new Uint8Array(await image.arrayBuffer()) : image;
  const img = await loadImage(bin);

  const c = createCanvas(size.width, size.height);
  c.getContext("2d").drawImage(img, 0, 0, size.width, size.height);
  const buffer = c.toBuffer("image/png");

  return new Uint8Array([...buffer]);
}

export function randomInt() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export async function convertToPng(image: Blob | Uint8Array) {
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
  const bin =
    image instanceof Blob ? new Uint8Array(await image.arrayBuffer()) : image;
  return await _loadImage(bin);
}

export function adjustResolution(
  width: number,
  height: number,
  pixels: number
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
  return Math.ceil(n / 64) * 64;
}
