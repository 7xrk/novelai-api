export {
  NovelAIDiffusionModels,
  NovelAIImageAugmentEmotionType,
  NovelAIImageNegativePromptPreset,
  NovelAIImageSamplers,
  NovelAIImageSizePreset,
  nagativePromptPreset,
  upscaleImage,
  augmentImage,
  generateImage,
  enhanceImage,
} from "./src/high_level.ts";

export * as novelaiApi from "./src/api.ts";

import { argonHash } from "./src/libs/argonHash.deno.ts";
import {
  createNovelAISessionClass,
  type NovelAISessionClass,
} from "./src/libs/session.ts";

export const NovelAISession: NovelAISessionClass =
  createNovelAISessionClass(argonHash);
export type NovelAISession = InstanceType<typeof NovelAISession>;
