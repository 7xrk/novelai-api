import { argonHash } from "./src/libs/argonHash.node.ts";
import { createNovelAISessionClass } from "./src/libs/session.ts";

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
} from "./src/high_level.ts";

export * as novelaiApi from "./src/api.ts";

export const NovelAISession = createNovelAISessionClass(argonHash);
export type NovelAISession = InstanceType<typeof NovelAISession>;
