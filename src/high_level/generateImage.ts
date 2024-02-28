import { fit } from "npm:object-fit-math";
import { loadImage } from "npm:@napi-rs/canvas";
import {
  NovelAIDiffusionModels,
  NovelAIImageSamplers,
  apiAiGenerateImage,
  nearest64,
} from "../endpoints/ai.ts";
import type { NovelAISession } from "../libs/session.ts";
import { resizeImage, nagativePromptPreset, randomInt } from "../high_level.ts";
import { type Size, convertToPng } from "./utils.ts";
import { adjustResolution } from "./utils.ts";

export const NovelAIImageNegativePromptPreset = Object.freeze({
  Heavy: "Heavy",
});

export type NovelAIImageNegativePromptPreset =
  (typeof NovelAIImageNegativePromptPreset)[keyof typeof NovelAIImageNegativePromptPreset];

export type GenerateImageParams = {
  prompt: string;
  /** 0 to 1 */
  promptGuideRescale?: number;
  negativePrompt?: string;
  negativePreset?: NovelAIImageNegativePromptPreset;
  model?: NovelAIDiffusionModels;
  scale?: number;
  steps?: number;
  size?: Size;
  limitToFreeInOpus?: boolean;
  qualityTags?: boolean;
  sampler?: NovelAIImageSamplers;
  seed?: number;
  smea?:
    | {
        dyn?: boolean;
      }
    | boolean;
  img2img?: {
    /** any image type blob */
    image: Blob | Uint8Array;
    /** 0 to 1 */
    strength: number;
    /** 0 to 1 */
    noise?: number;
    noiseSeed?: number;
    /** round image to specified width and height, it overrides width and height */
    keepAspect?: boolean;
  };
  vibeTransfer?: {
    /** any image type blob */
    image: Blob | Uint8Array;
    /** 0 to 1 */
    informationExtracted?: number;
    /** 0 to 1 */
    strength?: number;
  };
  vibeTransferMultiple?: {
    image: Blob | Uint8Array;
    /** 0 to 1 */
    informationExtracted?: number;
    /** 0 to 1 */
    strength?: number;
  }[];
  inpainting?: {
    /** any image type blob, white is inpainting */
    mask: Blob | Uint8Array;
    overlayOriginalImage: boolean;
  };
};

export async function generateImage(
  session: NovelAISession,
  {
    prompt,
    negativePrompt,
    negativePreset,
    model = NovelAIDiffusionModels.NAIDiffusionAnimeV3,
    sampler = NovelAIImageSamplers.Euler,
    scale = 5,
    steps = 28,
    size = { width: 512, height: 512 },
    qualityTags = true,
    promptGuideRescale = 0,
    smea,
    limitToFreeInOpus,
    seed,
    img2img,
    vibeTransfer,
    vibeTransferMultiple,
    inpainting,
  }: GenerateImageParams
) {
  let { width, height } = size;

  if (img2img?.keepAspect) {
    const img = await loadImage(
      img2img.image instanceof Blob
        ? new Uint8Array(await img2img.image.arrayBuffer())
        : img2img.image
    );

    const newSize = fit(
      { width, height },
      { width: img.width, height: img.height },
      "contain"
    );

    width = Math.round(newSize.width);
    height = Math.round(newSize.height);
  }

  if (limitToFreeInOpus) {
    steps = Math.min(steps, 28);
    [width, height] = adjustResolution(width, height, 1024 * 1024);
  }

  width = nearest64(width);
  height = nearest64(height);

  if (img2img) {
    img2img.image = await resizeImage(img2img.image, { width, height });
  }

  if (inpainting) {
    inpainting.mask = await resizeImage(inpainting.mask, { width, height });

    if (model === NovelAIDiffusionModels.NAIDiffusionAnimeV3) {
      model = NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting;
    }
  }

  if (qualityTags) {
    if (model === NovelAIDiffusionModels.NAIDiffusionAnimeV3)
      prompt += ", best quality, amazing quality, very aesthetic, absurdres";
  }

  if (negativePreset) {
    negativePrompt =
      nagativePromptPreset[negativePreset] + (negativePrompt ?? "");
  }

  return apiAiGenerateImage(session, {
    input: prompt,
    steps,
    width,
    height,
    negativePrompt,
    model,
    scale,
    sm: !!smea,
    smDyn: typeof smea === "boolean" ? false : !!smea?.dyn,
    qualityToggle: !!qualityTags,
    sampler: sampler,
    seed: seed ?? randomInt(),
    cfgRescale: promptGuideRescale,
    ...(img2img
      ? {
          image: (await convertToPng(img2img.image)).buffer,
          strength: img2img.strength,
          noise: img2img.noise,
          extraNoiseSeed: img2img.noiseSeed ?? randomInt(),
        }
      : {}),
    ...(vibeTransferMultiple
      ? {
          referenceImageMultiple: await Promise.all(
            vibeTransferMultiple.map(
              async ({ image }) => (await convertToPng(image)).buffer
            )
          ),
          referenceInformationExtractedMultiple: vibeTransferMultiple.map(
            (v) => v.informationExtracted
          ),
          referenceStrengthMultiple: vibeTransferMultiple.map(
            (v) => v.strength
          ),
        }
      : vibeTransfer
      ? {
          referenceImage: (await convertToPng(vibeTransfer.image)).buffer,
          referenceInformationExtracted: vibeTransfer.informationExtracted,
          referenceStrength: vibeTransfer.strength,
        }
      : {}),
    ...(inpainting
      ? {
          mask: (await convertToPng(inpainting.mask)).buffer,
          addOriginalImage: inpainting.overlayOriginalImage,
        }
      : {}),
  });
}
