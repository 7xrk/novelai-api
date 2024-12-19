export {
  upscaleImage,
  augmentImage,
  generateImage,
  getGenerateResolution,
  type GenerateImageResponse,
  type GenerateImageArgs,
  enhanceImage,
  userSubscription,
  type UserSubscriptionResponse,
} from "./src/high_level.ts";

export {
  NovelAIDiffusionModels,
  NovelAIImageSizePreset,
  NovelAIImageUCPreset,
  NovelAIImageSamplers,
  NovelAIAugmentImageRequestTypes,
  NovelAIImageAugmentEmotionType,
  UCPresetType,
  NovelAIImageExtraPresetType,
} from "./src/high_level/consts.ts";

export * as novelaiApi from "./src/api.ts";

import { argonHash } from "./src/libs/argonHash.deno.ts";
import {
  createNovelAISessionClass,
  type NovelAISessionClass,
} from "./src/libs/session.ts";

export const NovelAISession: NovelAISessionClass =
  createNovelAISessionClass(argonHash);
export type NovelAISession = InstanceType<typeof NovelAISession>;
