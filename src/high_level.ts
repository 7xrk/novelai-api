import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  NovelAIDiffusionModels,
  NovelAIImageSamplers,
  apiAiUpscale,
} from "./endpoints/ai.ts";
import type { NovelAISession } from "./libs/session.ts";
import { unzip } from "unzipit";
import { type Size, convertToPng } from "./high_level/utils.ts";
import { safeJsonParse } from "./utils.ts";

export {
  NovelAIImageAugmentEmotionType,
  augmentImage,
} from "./high_level/augmentImage.ts";
export {
  generateImage,
  NovelAIImageNegativePromptPreset,
} from "./high_level/generateImage.ts";

export const nagativePromptPreset: {
  Heavy: string;
} = Object.freeze({
  Heavy:
    "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract],",
});

export { NovelAIDiffusionModels, NovelAIImageSamplers };

type PresetSize = {
  width: number;
  height: number;
};

export const NovelAIImageSizePreset: NovelAIImageSizePreset = {
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
} as const;

export type NovelAIImageSizePreset = {
  NORMAL_PORTRAIT: PresetSize;
  NORMAL_LANDSCAPE: PresetSize;
  NORMAL_SQUARE: PresetSize;
  LARGE_PORTRAIT: PresetSize;
  LARGE_LANDSCAPE: PresetSize;
  LARGE_SQUARE: PresetSize;
  WALLPAPER_PORTRAIT: PresetSize;
  WALLPAPER_LANDSCAPE: PresetSize;
  SMALL_PORTRAIT: PresetSize;
  SMALL_LANDSCAPE: PresetSize;
  SMALL_SQUARE: PresetSize;
};

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
): Promise<{
  image: Blob;
}> {
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
    const json = safeJsonParse(body);

    if (json.ok && json.result?.message) {
      throw new Error(json.result.message);
    } else {
      throw new Error("Failed to upscale image", { cause: new Error(body) });
    }
  }

  const entries = Object.entries(
    (await unzip(await res.arrayBuffer())).entries
  );

  const images = await Promise.all(
    entries.map(async ([, entry]) => {
      return new Blob([await entry.arrayBuffer()], { type: "image/png" });
    })
  );

  return {
    image: images[0],
  };
}
