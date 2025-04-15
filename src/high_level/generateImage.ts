import { fit } from "object-fit-math";
import { apiAiGenerateImage } from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import {
  type Size,
  convertToPng,
  adjustResolution,
  nearest64,
  randomInt,
  resizeImage,
  loadImageAsImageData,
} from "./utils.ts";
import { encodeBase64, safeJsonParse } from "../utils.ts";
import { unzip } from "unzipit";
import type {
  NovelAIImageExtraPresetType,
  NovelAIImageUCPresetType,
} from "./consts.ts";
import {
  NovelAIAImageExtraPresets,
  NovelAIDiffusionModels,
  NovelAIImageUCPresetV4,
  NovelAIImageSamplers,
  NovelAIImageUCPresetV3,
  NovelAINoiseSchedulers,
} from "./consts.ts";
import { binarizeImage } from "./utils.ts";
import { loadImage } from "./utils.ts";

export type GenerateImageResponse = {
  params: Record<string, string | object>;
  files: Blob[];
};

const SKIP_CFG_ABOVE_SIGMA_VALUE = 19;

type Img2ImgImage = {
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

export type GenerateImageCharacterCaption = {
  prompt: string;
  center?: { x: number; y: number };
  uc?: string;
};

export type GenerateImageCharacterPrompts = {
  useCoords?: boolean;
  useOrder?: boolean;
  captions: Array<GenerateImageCharacterCaption>;
};

type V3VibeTransferInput = {
  image: Blob | Uint8Array;
  /** 0 to 1 */
  informationExtracted?: number;
  /** 0 to 1 */
  strength?: number;
};

type V4VibeTransferInput = {
  encodedVibe: Uint8Array;
  strength?: number;
};

export type GenerateImageArgs = {
  prompt: string;
  /** 0 to 1 */
  promptGuideRescale?: number;
  undesiredContent?: string;
  ucPreset?: NovelAIImageUCPresetType;
  characterPrompts?: GenerateImageCharacterPrompts;
  qualityTags?: boolean;
  extraPreset?: keyof typeof NovelAIImageExtraPresetType;
  v4LegacyConditioning?: boolean;
  model?: NovelAIDiffusionModels;
  scale?: number;
  steps?: number;
  size?: Size;
  nSamples?: number;
  limitToFreeInOpus?: boolean;
  sampler?: NovelAIImageSamplers;
  noiseSchedule?: NovelAINoiseSchedulers;
  seed?: number;
  guidance?: {
    decrisp?: boolean;
    variety?: boolean | number;
  };
  smea?:
    | {
        dyn?: boolean;
      }
    | boolean;
  img2img?: Img2ImgImage;
  viveTransfer?: (V3VibeTransferInput | V4VibeTransferInput)[];
  inpainting?: {
    /** any image type blob, white is inpainting */
    mask: Blob | Uint8Array;
    overlayOriginalImage: boolean;
  };
};

export async function generateImage(
  session: INovelAISession,
  {
    prompt,
    undesiredContent,
    ucPreset,
    model = NovelAIDiffusionModels.NAIDiffusionAnimeV3,
    sampler = NovelAIImageSamplers.Euler,
    noiseSchedule = NovelAINoiseSchedulers.Native,
    characterPrompts,
    extraPreset,
    v4LegacyConditioning,
    scale = 5,
    steps = 28,
    size = { width: 512, height: 512 },
    nSamples,
    qualityTags = true,
    promptGuideRescale = 0,
    guidance,
    smea,
    limitToFreeInOpus,
    seed,
    img2img,
    viveTransfer,
    inpainting,
  }: GenerateImageArgs
): Promise<GenerateImageResponse> {
  let { width, height } = size;

  if (!isV4Model(model) && characterPrompts) {
    throw new Error("characterPrompts is only supported with NovelAI V4 model");
  }

  if (isV4Model(model) && viveTransfer) {
    const hasOldVibeInput = viveTransfer.some((v) => "image" in v);

    if (hasOldVibeInput) {
      throw new Error(
        "Vive Transfer with Image is not supported with NovelAI V4 model"
      );
    }
  } else if (!isV4Model(model) && viveTransfer) {
    const hasEncodedVibeInput = viveTransfer.some((v) => "encodedVibe" in v);

    if (hasEncodedVibeInput) {
      throw new Error(
        "Vive Transfer with Encoded Vibe is not supported with NovelAI V3 model"
      );
    }
  }

  let i2iImageSize: Size | undefined;
  if (img2img?.keepAspect) {
    const img = await loadImage(
      img2img.image instanceof Blob
        ? new Uint8Array(await img2img.image.arrayBuffer())
        : img2img.image
    );

    i2iImageSize = { width: img.width, height: img.height };
  }

  if (limitToFreeInOpus) {
    steps = Math.min(steps, 28);
  }

  // NOTE: 1536x2048 is the maximum resolution for the model
  [width, height] = getGenerateResolution({
    size: { width, height },
    sourceImage: img2img?.keepAspect
      ? {
          width: i2iImageSize?.width!,
          height: i2iImageSize?.height!,
          keepAspect: true,
        }
      : undefined,
    limitToFreeInOpus,
  });

  // if (img2img) {
  //   img2img.image = await resizeImage(img2img.image, { width, height });
  // }

  if (inpainting) {
    // inpainting.mask = await resizeImage(inpainting.mask, { width, height });

    if (model === NovelAIDiffusionModels.NAIDiffusionAnimeV3) {
      model = NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting;
    }

    if (isV4Model(model)) {
      model = NovelAIDiffusionModels.NAIDiffusionV4FullInpainting;

      // NovelAI V4 requires 8-bit binary mask
      const resized = await resizeImage(inpainting.mask, { width, height });
      const imgData = await convertToPng(
        binarizeImage(await loadImageAsImageData(resized), 8)
      );
      inpainting.mask = imgData.buffer;
    }
  }

  let finalPrompt = prompt;
  let finalUndesired = undesiredContent ?? "";

  if (extraPreset) {
    const presetPrompt = NovelAIAImageExtraPresets[extraPreset];
    finalPrompt += presetPrompt;
  }

  if (qualityTags) {
    finalPrompt += getQualityTags(model);
  }

  if (ucPreset) {
    finalUndesired =
      getUndesiredQualityTags(model, ucPreset) + (finalUndesired ?? "");
  }
  seed ??= randomInt();

  const v4PreviewOverride = isV4Model(model)
    ? {
        sm: false,
        smDyn: false,
      }
    : {};

  const body = getGenerateImageParams({
    input: finalPrompt,
    steps,
    nSamples,
    width,
    height,
    negativePrompt: finalUndesired,
    characterPrompts,
    model,
    scale,
    sm: !!smea,
    smDyn: typeof smea === "boolean" ? false : !!smea?.dyn,
    legacyUC: v4LegacyConditioning,
    qualityToggle: !!qualityTags,
    sampler: sampler,
    seed,
    dynamicThresholding: guidance?.decrisp,
    noiseSchedule,
    // prettier-ignore
    skipCfgAboveSigma:
      typeof guidance?.variety === "number" ? guidance.variety
        : guidance?.variety === true ? SKIP_CFG_ABOVE_SIGMA_VALUE
        : null,
    cfgRescale: promptGuideRescale,
    ...(img2img
      ? {
          image: (await convertToPng(img2img.image)).buffer,
          strength: img2img.strength,
          noise: img2img.noise,
          extraNoiseSeed: img2img.noiseSeed ?? seed,
        }
      : {}),
    ...(viveTransfer && {
      referenceImageMultiple: await Promise.all(
        viveTransfer.map(async (v) =>
          "image" in v ? (await convertToPng(v.image)).buffer : v.encodedVibe
        )
      ),
      referenceInformationExtractedMultiple: viveTransfer.map((v) =>
        isV4Model(model) && "informationExtracted" in v
          ? v.informationExtracted
          : undefined
      ),
      referenceStrengthMultiple: viveTransfer.map((v) => v.strength),
    }),
    ...(inpainting
      ? {
          mask: (await convertToPng(inpainting.mask)).buffer,
          addOriginalImage: inpainting.overlayOriginalImage,
        }
      : {}),
    ...v4PreviewOverride,
  });

  try {
    const res = await apiAiGenerateImage(session, body);

    if (!res.ok) {
      const body = await res.text();
      const json = safeJsonParse(body);

      if (json.ok && json.result?.message) {
        throw new Error(`Failed to generate image: ${json.result.message}`);
      } else {
        throw new Error("Failed to generate image", {
          cause: new Error(body),
        });
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
      params: {
        ...body,
        input_original: prompt,
        negative_prompt_original: undesiredContent,
      },
      files: images,
    };
  } catch (e) {
    throw new ImageGenerationError((e as Error).message, {
      cause: e,
      params: body,
    });
  }
}

class ImageGenerationError extends Error {
  public params: any;

  constructor(message: string, options: ErrorOptions & { params?: any } = {}) {
    super(message, options);
    this.params = options.params;
  }
}

generateImage.variate = function variateImage(
  session: INovelAISession,
  img: Blob | Uint8Array,
  params: Omit<GenerateImageArgs, "img2img" | "inpainting">
): Promise<GenerateImageResponse> {
  return generateImage(session, {
    ...params,
    img2img: {
      image: img,
      strength: 0.5,
      noise: 0.1,
    },
  });
};

export function getGenerateResolution({
  sourceImage,
  size: { width, height } = { width: 512, height: 512 },
  limitToFreeInOpus,
}: {
  sourceImage?: Size & { keepAspect?: boolean };
  size?: Size;
  limitToFreeInOpus?: boolean;
}): [width: number, height: number] {
  if (sourceImage?.keepAspect) {
    const newSize = fit(
      { width, height },
      { width: sourceImage.width, height: sourceImage.height },
      "contain"
    );

    width = Math.round(newSize.width);
    height = Math.round(newSize.height);
  }

  if (limitToFreeInOpus) {
    [width, height] = adjustResolution(width, height, 1024 * 1024);
  }

  // NOTE: 1536x2048 is the maximum resolution for the model
  width = nearest64(width);
  height = nearest64(height);

  return [width, height];
}

type GenerateImageParams = {
  action: "generate" | "img2img" | "infill";
  input: string;
  model: NovelAIDiffusionModels;
  characterPrompts?: GenerateImageCharacterPrompts;

  /** Prompt Guidance Rescale */
  cfgRescale: number;
  controlnetStrength: number;
  dynamicThresholding: boolean;
  skipCfgAboveSigma: number | null;
  nSamples: number;
  legacy: boolean;
  legacyUC: boolean;
  legacyV3Extend: boolean;

  noiseSchedule: NovelAINoiseSchedulers;
  qualityToggle: boolean;

  // NC
  negativePrompt: string;
  uncondScale: number;

  sampler: NovelAIImageSamplers;
  scale: number;
  seed: number;
  sm: boolean;
  smDyn: boolean;
  steps: number;

  width: number;
  height: number;

  referenceImageMultiple: Uint8Array[];
  referenceInformationExtractedMultiple: (number | null | undefined)[];
  referenceStrengthMultiple: (number | null | undefined)[];
};

type Text2ImageParams = GenerateImageParams & {
  // References
  referenceImage?: Uint8Array | null;
  referenceInformationExtracted?: number;
  referenceStrength?: number;
};

type Image2ImageParams = GenerateImageParams & {
  /** Binary of png image */
  image: Uint8Array;
  strength: number;
  noise: number;
  extraNoiseSeed: number;
};

type InpaintParams = GenerateImageParams &
  Image2ImageParams & {
    addOriginalImage: boolean;
    mask?: Uint8Array;
  };

function getGenerateImageParams(
  params:
    | Partial<Text2ImageParams>
    | Partial<Image2ImageParams>
    | Partial<InpaintParams>
) {
  // deno-lint-ignore no-explicit-any
  const body: any = {
    action: "generate",
    input: params.input ?? "",
    model: params.model ?? NovelAIDiffusionModels.NAIDiffusionAnimeV3,
    parameters: {
      cfg_rescale: params.cfgRescale ?? 0,
      controlnet_strength: params.controlnetStrength ?? 1,
      dynamic_thresholding: params.dynamicThresholding ?? true,
      skip_cfg_above_sigma: params.skipCfgAboveSigma ?? null,
      legacy: params.legacy ?? false,
      legacy_uc: params.legacyUC ?? false,
      legacy_v3_extend: params.legacyV3Extend ?? false,
      n_samples: params.nSamples ?? 1,
      negative_prompt: params.negativePrompt ?? "",
      params_version: 3,
      uncond_scale: params.uncondScale ?? 1,
      noise_schedule: params.noiseSchedule ?? NovelAINoiseSchedulers.Native,
      qualityToggle: params.qualityToggle ?? false,
      sampler: params.sampler ?? "k_euler",
      scale: params.scale ?? 5,
      seed: params.seed ?? 0,
      sm: params.sm ?? false,
      sm_dyn: params.smDyn ?? false,
      steps: params.steps ?? 28,
      width: nearest64(params.width ?? 512),
      height: nearest64(params.height ?? 512),
    },
  };

  if (isV4Model(body.model)) {
    body.parameters.use_coords = false;
    body.parameters.prefer_brownian = true;
    body.parameters.deliberate_euler_ancestral_bug = false;

    if (body.parameters.noise_schedule === NovelAINoiseSchedulers.Native) {
      body.parameters.noise_schedule = NovelAINoiseSchedulers.Karras;
    }

    if (params.characterPrompts) {
      const { useCoords, useOrder } = params.characterPrompts;
      const characters = params.characterPrompts.captions ?? [];

      body.parameters.use_coords = !!useCoords;

      body.parameters.characterPrompts = characters.map((v) => ({
        prompt: v.prompt,
        center: v.center ?? { x: 0.5, y: 0.5 },
        uc: v.uc ?? "",
      }));

      body.parameters.v4_negative_prompt = {
        legacy_uc: !!params.legacyUC,
        caption: {
          base_caption: params.negativePrompt ?? "",
          char_captions: characters.map((v) => ({
            char_caption: v.uc ?? "",
            centers: [v.center ?? { x: 0.5, y: 0.5 }],
          })),
        },
      };

      body.parameters.v4_prompt = {
        caption: {
          base_caption: params.input ?? "",
          char_captions: characters.map((v) => ({
            char_caption: v.prompt ?? "",
            centers: [v.center ?? { x: 0.5, y: 0.5 }],
          })),
        },
        use_coords: !!useCoords,
        use_order: !!useOrder,
      };
    }
  }

  if ("referenceImageMultiple" in params && params.referenceImageMultiple) {
    if (
      params.referenceImageMultiple.length !==
        params.referenceInformationExtractedMultiple?.length ||
      params.referenceImageMultiple.length !==
        params.referenceStrengthMultiple?.length
    ) {
      throw new Error(
        "referenceImageMultiple, referenceInformationExtractedMultiple, and referenceStrengthMultiple must have the same length"
      );
    }

    const images = params.referenceImageMultiple;
    const extracted = params.referenceInformationExtractedMultiple;
    const strength = params.referenceStrengthMultiple;

    body.parameters.reference_image_multiple = images.map(encodeBase64);
    body.parameters.reference_information_extracted_multiple = Array.from(
      { length: images.length },
      (_, i) => extracted[i] ?? 1
    );
    body.parameters.reference_strength_multiple = Array.from(
      { length: images.length },
      (_, i) => strength[i] ?? 0.6
    );
  } else if ("referenceImage" in params && params.referenceImage) {
    body.parameters.reference_image = encodeBase64(params.referenceImage);
    body.parameters.reference_information_extracted =
      params.referenceInformationExtracted ?? 1;
    body.parameters.reference_strength = params.referenceStrength ?? 0.6;
  }

  if ("image" in params && params.image) {
    body.action = "img2img";
    body.parameters.image = encodeBase64(params.image);
    body.parameters.strength = params.strength ?? 0.5;
    body.parameters.noise = params.noise ?? 0;
    body.parameters.extra_noise_seed =
      params.extraNoiseSeed ?? params.seed ?? 0;
  }

  if ("mask" in params && params.mask) {
    body.action = "infill";
    body.parameters.mask = encodeBase64(params.mask);
    body.parameters.add_original_image = params.addOriginalImage ?? true;
  }

  return body;
}

function isV4Model(model: NovelAIDiffusionModels) {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview ||
    model === NovelAIDiffusionModels.NAIDiffusionV4Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4FullInpainting
  );
}

function getQualityTags(model: NovelAIDiffusionModels) {
  if (model === NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview) {
    return ", rating:general, best quality, very aesthetic, absurdres";
  } else if (isV4Model(model)) {
    return ", no text, best quality, very aesthetic, absurdres";
  }

  return ", best quality, amazing quality, very aesthetic, absurdres";
}

function getUndesiredQualityTags(
  model: NovelAIDiffusionModels,
  ucPreset: NovelAIImageUCPresetType
) {
  if (isV4Model(model)) {
    if (ucPreset === "Heavy" || ucPreset === "Light" || ucPreset === "None") {
      return NovelAIImageUCPresetV4[ucPreset];
    }
  }

  return NovelAIImageUCPresetV3[ucPreset];
}
