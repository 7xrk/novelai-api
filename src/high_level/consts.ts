type PresetSize = {
  width: number;
  height: number;
};

export const NovelAIImageSizePreset: NovelAIImageSizePreset = /* @__PURE__ */ {
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
};
Object.freeze(NovelAIImageSizePreset);

export type NovelAIImageSizePreset = /* @__PURE__ */ {
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

export const NovelAIDiffusionModels = /* @__PURE__ */ {
  NAIDiffusionAnimeV3: "nai-diffusion-3",
  NAIDiffusionAnimeV3Inpainting: "nai-diffusion-3-inpainting",
  NAIDiffusionV4CuratedPreview: "nai-diffusion-4-curated-preview",
  NAIDiffusionV4Full: "nai-diffusion-4-full",
  NAIDiffusionV4FullInpainting: "nai-diffusion-4-full-inpainting",
} as const;
Object.freeze(NovelAIDiffusionModels);

export type NovelAIDiffusionModels =
  (typeof NovelAIDiffusionModels)[keyof typeof NovelAIDiffusionModels];

export const NovelAIImageSamplers = /* @__PURE__ */ {
  Euler: "k_euler",
  EulerAncestral: "k_euler_ancestral",
  DPMpp_2S_Ancestral: "k_dpmpp_2s_ancestral",
  DPMpp_2M_SDE: "k_dpmpp_2m_sde",
  DPMpp_2M: "k_dpmpp_2m",
} as const;
Object.freeze(NovelAIImageSamplers);

export type NovelAIImageSamplers =
  (typeof NovelAIImageSamplers)[keyof typeof NovelAIImageSamplers];

export const NovelAINoiseSchedulers = /* @__PURE__ */ {
  Native: "native",
  Karras: "karras",
  Exponential: "exponential",
  PolyExponential: "polyexponential",
} as const;
Object.freeze(NovelAINoiseSchedulers);

export type NovelAINoiseSchedulers =
  (typeof NovelAINoiseSchedulers)[keyof typeof NovelAINoiseSchedulers];

export const NovelAIAugmentImageRequestTypes = /* @__PURE__ */ {
  removeBg: "bg-removal",
  sketch: "sketch",
  lineArt: "lineart",
  emotion: "emotion",
  colorize: "colorize",
} as const;
Object.freeze(NovelAIAugmentImageRequestTypes);

export type NovelAIAugmentImageRequestTypes =
  (typeof NovelAIAugmentImageRequestTypes)[keyof typeof NovelAIAugmentImageRequestTypes];

export const NovelAIImageUCPresetV3 = /* @__PURE__ */ {
  Heavy:
    "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract],",
  Light:
    "nsfw, lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing,",
  HumanFocus:
    "nsfw, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands, @_@, mismatched pupils, heart-shaped pupils, glowing eyes,",
  None: "lowres",
} as const;
Object.freeze(NovelAIImageUCPresetV3);

export const NovelAIImageUCPresetV4 = /* @__PURE__ */ {
  Heavy:
    "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts, white blank page, blank page, ",
  Light:
    "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page, ",
  None: "",
} as const;
Object.freeze(NovelAIImageUCPresetV4);

export const NovelAIImageAugmentEmotionType = /* @__PURE__ */ {
  neutral: "neutral",
  happy: "happy",
  sad: "sad",
  angry: "angry",
  scared: "scared",
  surprized: "surprized",
  tired: "tired",
  excited: "excited",
  nervous: "nervous",
  thinking: "thinking",
  confused: "confused",
  shy: "shy",
  disgusted: "disgusted",
  smug: "smug",
  bored: "bored",
  laguhing: "laguhing",
  irritated: "irritated",
  aroused: "aroused",
  embarrassed: "embarrassed",
  worried: "worried",
  love: "love",
  determined: "determined",
  hurt: "hurt",
  playful: "playful",
} as const;
Object.freeze(NovelAIImageAugmentEmotionType);

export type NovelAIImageAugmentEmotionType =
  (typeof NovelAIImageAugmentEmotionType)[keyof typeof NovelAIImageAugmentEmotionType];

export const NovelAIImageUCPresetType = /* @__PURE__ */ {
  Heavy: "Heavy",
  Light: "Light",
  HumanFocus: "HumanFocus",
  None: "None",
} as const;
Object.freeze(NovelAIImageUCPresetType);

export type NovelAIImageUCPresetType =
  (typeof NovelAIImageUCPresetType)[keyof typeof NovelAIImageUCPresetType];

export const NovelAIAImageExtraPresets = /* @__PURE__ */ {
  HolidaySprits2024: ",{{{{snowing, holly, christmas tree, christmas}}}}",
};
Object.freeze(NovelAIAImageExtraPresets);

export const NovelAIImageExtraPresetType = /* @__PURE__ */ {
  HolidaySprits2024: "HolidaySprits2024",
};
Object.freeze(NovelAIImageExtraPresetType);

export type NovelAIImageExtraPresetType =
  (typeof NovelAIImageUCPresetV3)[keyof typeof NovelAIImageUCPresetV3];
