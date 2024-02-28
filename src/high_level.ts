import { createCanvas, loadImage } from "npm:@napi-rs/canvas";
import {
  NovelAIDiffusionModels,
  NovelAIImageSamplers,
  apiAiUpscale,
} from "./endpoints/ai.ts";
import type { NovelAISession } from "./libs/session.ts";
import { unzip } from "npm:unzipit";
import { type Size, convertToPng } from "./high_level/utils.ts";

export {
  NovelAIImageAugmentEmotionType,
  augmentImage,
} from "./high_level/augmentImage.ts";
export {
  generateImage,
  NovelAIImageNegativePromptPreset,
} from "./high_level/generateImage.ts";

export const nagativePromptPreset = Object.freeze({
  Heavy:
    "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract],",
});

export { NovelAIDiffusionModels, NovelAIImageSamplers };

export const NovelAIImageSizePreset = Object.freeze({
  NORMAL_PORTRAIT: Object.freeze({ width: 832, height: 1216 }),
  NORMAL_LANDSCAPE: Object.freeze({ width: 1216, height: 832 }),
  NORMAL_SQUARE: Object.freeze({ width: 1024, height: 1024 }),
  LARGE_PORTRAIT: Object.freeze({ width: 1024, height: 1536 }),
  LARGE_LANDSCAPE: Object.freeze({ width: 1536, height: 1024 }),
  LARGE_SQUARE: Object.freeze({ width: 1472, height: 1472 }),
  WALLPAPER_PORTRAIT: Object.freeze({ width: 1088, height: 1920 }),
  WALLPAPER_LANDSCAPE: Object.freeze({ width: 1920, height: 1088 }),
  SMALL_PORTRAIT: Object.freeze({ width: 512, height: 768 }),
  SMALL_LANDSCAPE: Object.freeze({ width: 768, height: 512 }),
  SMALL_SQUARE: Object.freeze({ width: 640, height: 640 }),
});

export async function resizeImage(image: Blob | Uint8Array, size: Size) {
  const bin =
    image instanceof Blob ? new Uint8Array(await image.arrayBuffer()) : image;
  const img = await loadImage(bin);

  const c = createCanvas(size.width, size.height);
  c.getContext("2d").drawImage(img, 0, 0, size.width, size.height);
  const buffer = c.toBuffer("image/png");
  // c.dispose();
  return buffer;
}

export function randomInt() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export async function upscaleImage(
  session: NovelAISession,
  {
    image,
    scale,
  }: {
    /** NovelAI generated raw png binary */
    image: Uint8Array;
    scale: number;
  }
) {
  if (scale !== 2 && scale !== 4) {
    throw new Error(`Invalid scale, expected 2 or 4 but got ${scale}`);
  }

  const png = await convertToPng(image);

  const res = await apiAiUpscale(session, {
    image,
    width: png.imageSize.width,
    height: png.imageSize.height,
    scale,
  });

  if (!res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body);

      if (json.result?.message) {
        throw new Error(json.result.message);
      }
    } catch (e) {
      throw new Error(body, { cause: e });
    }
  }

  const entries = Object.entries(
    (await unzip(await res.arrayBuffer())).entries
  );

  const images: Blob[] = [];
  for (const [, entry] of entries) {
    images.push(new Blob([await entry.arrayBuffer()], { type: "image/png" }));
  }

  return {
    image: images[0],
  };
}
