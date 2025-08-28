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
  NAIDiffusionFurryV3: "nai-diffusion-furry-3",
  NAIDiffusionFurryV3Inpainting: "nai-diffusion-furry-3-inpainting",
  NAIDiffusionV4CuratedPreview: "nai-diffusion-4-curated-preview",
  NAIDiffusionV4CuratedInpainting: "nai-diffusion-4-curated-inpainting",
  NAIDiffusionV4Full: "nai-diffusion-4-full",
  NAIDiffusionV4FullInpainting: "nai-diffusion-4-full-inpainting",
  NAIDiffusionV4_5Curated: "nai-diffusion-4-5-curated",
  NAIDiffusionV4_5CuratedInpainting: "nai-diffusion-4-5-curated-inpainting",
  NAIDiffusionV4_5Full: "nai-diffusion-4-5-full",
  NAIDiffusionV4_5FullInpainting: "nai-diffusion-4-5-full-inpainting",
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
  (typeof NovelAIAugmentImageRequestTypes)[
    keyof typeof NovelAIAugmentImageRequestTypes
  ];

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
  (typeof NovelAIImageAugmentEmotionType)[
    keyof typeof NovelAIImageAugmentEmotionType
  ];

export const NovelAIImageUCPresetType = /* @__PURE__ */ {
  Heavy: "heavy",
  Light: "light",
  HumanFocus: "humanFocus",
  FurryFocus: "furryFocus",
  None: "none",
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

export const NovelAIImageQualityPresets = {
  [NovelAIDiffusionModels.NAIDiffusionFurryV3]:
    ", {best quality}, {amazing quality}",
  [NovelAIDiffusionModels.NAIDiffusionFurryV3Inpainting]:
    ", {best quality}, {amazing quality}",

  [NovelAIDiffusionModels.NAIDiffusionAnimeV3]:
    ", best quality, amazing quality, very aesthetic, absurdres",
  [NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting]:
    ", best quality, amazing quality, very aesthetic, absurdres",

  [NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview]:
    ", rating:general, best quality, very aesthetic, absurdres",
  [NovelAIDiffusionModels.NAIDiffusionV4CuratedInpainting]:
    ", rating:general, best quality, very aesthetic, absurdres",

  [NovelAIDiffusionModels.NAIDiffusionV4Full]:
    ", no text, best quality, very aesthetic, absurdres",
  [NovelAIDiffusionModels.NAIDiffusionV4FullInpainting]:
    ", no text, best quality, very aesthetic, absurdres",

  [NovelAIDiffusionModels.NAIDiffusionV4_5Curated]:
    ", very aesthetic, masterpiece, no text, -0.8::feet::, rating:general",
  [NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting]:
    ", very aesthetic, masterpiece, no text, -0.8::feet::, rating:general",

  [NovelAIDiffusionModels.NAIDiffusionV4_5Full]:
    ", very aesthetic, masterpiece, no text",
  [NovelAIDiffusionModels.NAIDiffusionV4_5FullInpainting]:
    ", very aesthetic, masterpiece, no text",

  default: "masterpiece, best quality, ",
} as const;
Object.freeze(NovelAIImageQualityPresets);

export const NovelAIImageUCPresets = {
  [NovelAIDiffusionModels.NAIDiffusionAnimeV3]: {
    heavy:
      "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract],",
    light:
      "lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing,",
    humanFocus:
      "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands, @_@, mismatched pupils, heart-shaped pupils, glowing eyes,",
    none: "lowres,",
  },
  [NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting]: {
    // Same as AnimeV3
    heavy:
      "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract],",
    light:
      "lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing,",
    humanFocus:
      "lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands, @_@, mismatched pupils, heart-shaped pupils, glowing eyes,",
    none: "lowres,",
  },

  [NovelAIDiffusionModels.NAIDiffusionFurryV3]: {
    heavy:
      "{{worst quality}}, [displeasing], {unusual pupils}, guide lines, {{unfinished}}, {bad}, url, artist name, {{tall image}}, mosaic, {sketch page}, comic panel, impact (font), [dated], {logo}, ych, {what}, {where is your god now}, {distorted text}, repeated text, {floating head}, {1994}, {widescreen}, absolutely everyone, sequence, {compression artifacts}, hard translated, {cropped}, {commissioner name}, unknown text, high contrast,",
    light:
      "{worst quality}, guide lines, unfinished, bad, url, tall image, widescreen, compression artifacts, unknown text,",
    none: "lowres",
  },
  [NovelAIDiffusionModels.NAIDiffusionFurryV3Inpainting]: {
    // Same as FurryV3
    heavy:
      "{{worst quality}}, [displeasing], {unusual pupils}, guide lines, {{unfinished}}, {bad}, url, artist name, {{tall image}}, mosaic, {sketch page}, comic panel, impact (font), [dated], {logo}, ych, {what}, {where is your god now}, {distorted text}, repeated text, {floating head}, {1994}, {widescreen}, absolutely everyone, sequence, {compression artifacts}, hard translated, {cropped}, {commissioner name}, unknown text, high contrast,",
    light:
      "{worst quality}, guide lines, unfinished, bad, url, tall image, widescreen, compression artifacts, unknown text,",
    none: "lowres",
  },

  [NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview]: {
    heavy:
      "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts, white blank page, blank page,",
    light:
      "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature, white blank page, blank page,",
    none: "",
  },
  [NovelAIDiffusionModels.NAIDiffusionV4CuratedInpainting]: {
    // Same as V4CuratedPreview
    heavy:
      "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts, white blank page, blank page,",
    light:
      "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature, white blank page, blank page,",
    none: "",
  },

  [NovelAIDiffusionModels.NAIDiffusionV4Full]: {
    heavy:
      "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page,",
    light:
      "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page,",
    none: "",
  },
  [NovelAIDiffusionModels.NAIDiffusionV4FullInpainting]: {
    // Same as V4Full
    heavy:
      "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page,",
    light:
      "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page,",
    none: "",
  },

  [NovelAIDiffusionModels.NAIDiffusionV4_5Curated]: {
    heavy:
      "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page,",
    light:
      "blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page,",
    humanFocus:
      "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page,",
    none: "",
  },
  [NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting]: {
    // Same as V4_5Curated
    heavy:
      "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page,",
    light:
      "blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page,",
    humanFocus:
      "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page,",
    none: "",
  },

  [NovelAIDiffusionModels.NAIDiffusionV4_5Full]: {
    heavy:
      "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page,",
    light:
      "lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page,",
    furryFocus:
      "{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic,",
    humanFocus:
      "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, @_@, mismatched pupils, glowing eyes, bad anatomy,",
    none: "",
  },
  [NovelAIDiffusionModels.NAIDiffusionV4_5FullInpainting]: {
    heavy:
      "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page,",
    light:
      "lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page,",
    furryFocus:
      "{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic",
    humanFocus:
      "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, @_@, mismatched pupils, glowing eyes, bad anatomy",
  },
} as const;
Object.freeze(NovelAIImageUCPresets);

export type NovelAIImageUCPresets = typeof NovelAIImageUCPresets;
