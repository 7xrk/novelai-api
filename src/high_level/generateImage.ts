import { fit, fitAndPosition } from "object-fit-math";
import {
  apiAiGenerateImage,
  apiAiGenerateImageStream,
} from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import {
  adjustResolution,
  convertToPng,
  loadImageAsImageData,
  nearest64,
  randomInt,
  resizeImage,
  type Size,
} from "./utils.ts";
import {
  encodeBase64,
  responseToEventStream,
  safeJsonParse,
} from "../utils.ts";
import { unzip } from "unzipit";
import {
  NovelAIAImageExtraPresets,
  NovelAIDiffusionModels,
  type NovelAIImageExtraPresetType,
  NovelAIImageQualityPresets,
  NovelAIImageSamplers,
  NovelAIImageUCPresets,
  NovelAIImageUCPresetType,
  NovelAINoiseSchedulers,
} from "./consts.ts";
import { binarizeImage } from "./utils.ts";
import { loadImage } from "./utils.ts";
import { Canvas } from "@napi-rs/canvas";

export type GenerateImageResponse = {
  params: Record<string, string | object>;
  files: Blob[];
};

export type GenerateImageStreamResponse = ReadableStream<
  | {
    type: "event";
    data: string;
  }
  | {
    type: "data";
    data:
      | {
        event_type: "final";
        samp_ix: number;
        gen_id: number;
        image: string;
        params: Record<string, string | object>;
      }
      | {
        event_type: "intermediate";
        samp_ix: number;
        step_ix: number;
        gen_id: number;
        sigma: number;
        image: string;
        params: Record<string, string | object>;
      };
  }
>;

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

type V4_5CharacterReferenceInput = {
  image: Blob | Uint8Array;
  /** @default false */
  styleAware?: boolean;
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
      auto?: boolean;
      dyn?: boolean;
    }
    | boolean;
  img2img?: Img2ImgImage;
  viveTransfer?: (V3VibeTransferInput | V4VibeTransferInput)[];
  characterReference?: V4_5CharacterReferenceInput[];
  inpainting?: {
    /** any image type blob, white is inpainting */
    mask: Blob | Uint8Array;
    /** 0 to 1 ("inpaintImg2ImgStrength") */
    strength?: number;
    addOriginalImage: boolean;
  };
  signal?: AbortSignal;
};

export async function generateImageStream(
  session: INovelAISession,
  params: GenerateImageArgs,
): Promise<GenerateImageStreamResponse> {
  if (isV3Model(params.model ?? NovelAIDiffusionModels.NAIDiffusionV4_5Full)) {
    // V3 models do not support stream generation
    return new ReadableStream({
      async start(controller) {
        const res = await generateImage(session, params);

        for (const file of res.files) {
          controller.enqueue({
            type: "event",
            data: "final",
          });
          controller.enqueue({
            type: "data",
            data: {
              event_type: "final",
              samp_ix: 0,
              gen_id: randomInt(),
              image: encodeBase64(new Uint8Array(await file.arrayBuffer())),
              params: res.params,
            },
          });
        }

        controller.close();
      },
    });
  }

  params = await checkAndNormalizeParams(params);

  const body = await getGenerateImageParams(params);

  try {
    const res = await apiAiGenerateImageStream(session, body, {
      signal: params.signal,
    });

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

    const eventStream = responseToEventStream(res);

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of eventStream) {
            // console.log(event.data, event.type);
            if (event.type === "event") {
              controller.enqueue({
                type: "event",
                data: event.data,
              });
            } else if (event.type === "data") {
              const data = JSON.parse(event.data);

              event.data = JSON.stringify(
                Object.assign(data, {
                  params: {
                    ...body,
                    input_original: params.prompt,
                    negative_prompt_original: params.undesiredContent,
                  },
                }),
              );

              controller.enqueue({
                type: "data",
                data: JSON.parse(event.data),
              });
            }
          }
        } finally {
          controller.close();
        }
      },
    });
  } catch (e) {
    throw new ImageGenerationError((e as Error).message, {
      cause: e,
      params: body,
    });
  }
}

export async function generateImage(
  session: INovelAISession,
  params: GenerateImageArgs,
): Promise<GenerateImageResponse> {
  params = await checkAndNormalizeParams(params);

  const body = await getGenerateImageParams(params);

  try {
    const res = await apiAiGenerateImage(session, body, {
      signal: params.signal,
    });

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
      (await unzip(await res.arrayBuffer())).entries,
    );

    const images: Blob[] = [];
    for (const [, entry] of entries) {
      images.push(new Blob([await entry.arrayBuffer()], { type: "image/png" }));
    }

    return {
      params: {
        ...body,
        input_original: params.prompt,
        negative_prompt_original: params.undesiredContent,
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
  params: Omit<GenerateImageArgs, "img2img" | "inpainting">,
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
      "contain",
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

async function checkAndNormalizeParams({
  prompt,
  undesiredContent,
  ucPreset,
  model = NovelAIDiffusionModels.NAIDiffusionV4_5Full,
  sampler = NovelAIImageSamplers.Euler,
  noiseSchedule = NovelAINoiseSchedulers.Native,
  characterPrompts,
  characterReference,
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
}: GenerateImageArgs) {
  let { width, height } = size;

  if (!isCharacterPromptsAvailable(model) && characterPrompts) {
    throw new Error("characterPrompts is only supported with NovelAI V4 model");
  }

  if (isEncodedVibeTransferRequired(model) && viveTransfer) {
    const hasOldVibeInput = viveTransfer.some((v) => "image" in v);

    if (hasOldVibeInput) {
      throw new Error(
        "Vive Transfer with Image is not supported with NovelAI V4 model",
      );
    }
  } else if (!isImageVibeTransferRequired(model) && viveTransfer) {
    const hasEncodedVibeInput = viveTransfer.some((v) => "encodedVibe" in v);

    if (hasEncodedVibeInput) {
      throw new Error(
        "Vive Transfer with Encoded Vibe is not supported with NovelAI V3 model",
      );
    }
  }

  let i2iImageSize: Size | undefined;
  if (img2img?.keepAspect) {
    const img = await loadImage(
      img2img.image instanceof Blob
        ? new Uint8Array(await img2img.image.arrayBuffer())
        : img2img.image,
    );

    i2iImageSize = { width: img.width, height: img.height };
  }

  if (limitToFreeInOpus) {
    steps = Math.min(steps, 28);

    if (isEncodedVibeTransferRequired(model)) {
      viveTransfer = viveTransfer?.splice(0, 4);
    }
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

  if (img2img) {
    img2img.image = await resizeImage(img2img.image, { width, height });
  }

  if (inpainting) {
    switch (model) {
      case NovelAIDiffusionModels.NAIDiffusionAnimeV3:
        model = NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting;
        break;
      case NovelAIDiffusionModels.NAIDiffusionFurryV3:
        model = NovelAIDiffusionModels.NAIDiffusionFurryV3Inpainting;
        break;
      case NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview:
        model = NovelAIDiffusionModels.NAIDiffusionV4CuratedInpainting;
        break;
      case NovelAIDiffusionModels.NAIDiffusionV4Full:
        model = NovelAIDiffusionModels.NAIDiffusionV4FullInpainting;
        break;
      case NovelAIDiffusionModels.NAIDiffusionV4_5Curated:
        model = NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting;
        break;
      case NovelAIDiffusionModels.NAIDiffusionV4_5Full:
        model = NovelAIDiffusionModels.NAIDiffusionV4_5FullInpainting;
        break;
    }

    // NovelAI V4 requires 8px binary mask
    const resized = await resizeImage(inpainting.mask, { width, height });
    const imgData = await convertToPng(
      binarizeImage(await loadImageAsImageData(resized), 8),
    );
    inpainting.mask = new Uint8Array(imgData.buffer);
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
    finalUndesired = getUndesiredQualityTags(model, ucPreset) +
      (finalUndesired ?? "");
  }

  if (characterReference && characterReference.length > 0) {
    for (const ref of characterReference) {
      const png = await convertToPng(ref.image);

      if (png.imageSize.width > 1536 || png.imageSize.height > 1536) {
        const fitTarget = png.imageSize.width > png.imageSize.height
          ? { width: 1536, height: 1024 }
          : { width: 1024, height: 1536 };

        const fitSize = fitAndPosition(
          fitTarget,
          png.imageSize,
          "contain",
          "50%",
          "50%",
        );

        const canvas = new Canvas(fitTarget.width, fitTarget.height);
        const ctx = canvas.getContext("2d");
        const img = await loadImage(new Uint8Array(png.buffer));
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, fitSize.width, fitSize.height);
        ctx.drawImage(img, fitSize.x, fitSize.y, fitSize.width, fitSize.height);
        ref.image = new Uint8Array(await canvas.encode("png"));
      } else if (
        (png.imageSize.width % 64) !== 0 ||
        (png.imageSize.height % 64) !== 0
      ) {
        // If the image is not a multiple of 64, we need to pad it
        const canvas = new Canvas(
          nearest64(png.imageSize.width),
          nearest64(png.imageSize.height),
        );
        const ctx = canvas.getContext("2d");
        const img = await loadImage(new Uint8Array(png.buffer));
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height);
        ref.image = new Uint8Array(await canvas.encode("png"));
      }
    }
  }

  seed ??= randomInt();

  const disableSmeaOverride = isV4XModel(model)
    ? {
      sm: false,
      smDyn: false,
    }
    : {};

  if (!isViveTransferAvailable(model) && viveTransfer) {
    console.info(
      `Vive Transfer is not available for model ${model}. Skip to attach reference images.`,
    );

    viveTransfer = undefined;
  }

  return {
    prompt: finalPrompt,
    undesiredContent: finalUndesired,
    model,
    sampler,
    noiseSchedule,
    characterPrompts,
    v4LegacyConditioning: !!v4LegacyConditioning,
    scale,
    steps,
    size: { width, height },
    nSamples,
    qualityTags,
    promptGuideRescale,
    guidance: {
      decrisp: guidance?.decrisp ?? false,
      variety: guidance?.variety ?? false,
    },
    smea: typeof smea === "boolean" ? { auto: smea } : smea,
    seed,
    img2img,
    viveTransfer,
    inpainting,
    characterReference,
    ...disableSmeaOverride,
  } satisfies GenerateImageArgs;
}

async function getGenerateImageParams(params: GenerateImageArgs) {
  // deno-lint-ignore no-explicit-any
  const body: any = {
    action: "generate",
    input: params.prompt ?? "",
    model: params.model ?? NovelAIDiffusionModels.NAIDiffusionAnimeV3,
    parameters: {
      cfg_rescale: params.promptGuideRescale ?? 0,
      controlnet_strength: 1,
      dynamic_thresholding: params.guidance?.decrisp ?? true,
      skip_cfg_above_sigma: typeof params.guidance?.variety === "number"
        ? params.guidance.variety
        : params.guidance?.variety === true
        ? SKIP_CFG_ABOVE_SIGMA_VALUE
        : null,
      legacy: false,
      legacy_uc: params.v4LegacyConditioning ?? false,
      legacy_v3_extend: false,
      n_samples: params.nSamples ?? 1,
      negative_prompt: params.undesiredContent ?? "",
      params_version: 3,
      noise_schedule: params.noiseSchedule ?? NovelAINoiseSchedulers.Native,
      qualityToggle: params.qualityTags ?? false,
      sampler: params.sampler ?? "k_euler",
      scale: params.scale ?? 5,
      seed: params.seed ?? 0,
      sm: isSmeaAvailableModel(params.model!) && params.smea
        ? !!params.smea
        : false,
      sm_dyn: typeof params.smea === "boolean" ? false : !!params.smea?.dyn,
      autoSmea: typeof params.smea === "boolean" || params.smea?.auto,
      steps: params.steps ?? 28,
      width: nearest64(params.size?.width ?? 512),
      height: nearest64(params.size?.height ?? 512),
    },
  };

  if (isV4XModel(body.model)) {
    body.parameters.use_coords = false;
    body.parameters.prefer_brownian = true;
    body.parameters.deliberate_euler_ancestral_bug = false;

    if (body.parameters.noise_schedule === NovelAINoiseSchedulers.Native) {
      body.parameters.noise_schedule = NovelAINoiseSchedulers.Karras;
    }

    // v4_prompt and v4_negative_prompt is required for V4 models
    // if missing it will result in an internal server error
    body.parameters.v4_negative_prompt = {
      legacy_uc: !!params.v4LegacyConditioning,
      caption: {
        base_caption: params.undesiredContent ?? "",
        char_captions: [],
      },
    };

    body.parameters.v4_prompt = {
      use_coords: false,
      use_order: true,
      caption: {
        base_caption: params.prompt ?? "",
        char_captions: [],
      },
    };

    if (params.characterPrompts) {
      const { useCoords, useOrder } = params.characterPrompts;
      const characters = params.characterPrompts.captions ?? [];

      body.parameters.use_coords = !!useCoords;
      body.parameters.v4_prompt.use_coords = !!useCoords;
      body.parameters.v4_prompt.use_order = !!useOrder;

      body.parameters.characterPrompts = characters.map((v) => ({
        prompt: v.prompt,
        center: v.center ?? { x: 0.5, y: 0.5 },
        uc: v.uc ?? "",
      }));

      body.parameters.v4_negative_prompt.caption.char_captions = characters.map(
        (v) => ({
          char_caption: v.uc ?? "",
          centers: [v.center ?? { x: 0.5, y: 0.5 }],
        }),
      );

      body.parameters.v4_prompt.caption.char_captions = characters.map((v) => ({
        char_caption: v.prompt ?? "",
        centers: [v.center ?? { x: 0.5, y: 0.5 }],
      }));
    }
  }

  if (params.characterReference && params.characterReference.length > 0) {
    if (!isCharacterReferenceAvailable(params.model!)) {
      console.info(
        `Character Reference is not available for model ${params.model}. Skip to attach reference images.`,
      );
    } else {
      if (
        (params.viveTransfer && params.viveTransfer.length > 0) ||
        !!params.inpainting
      ) {
        throw new Error(
          "Character Reference cannot be used with Vive Transfer or Inpainting",
        );
      }

      body.parameters.director_reference_descriptions = [];
      body.parameters.director_reference_images = [];
      body.parameters.director_reference_information_extracted = [];
      body.parameters.director_reference_strength_values = [];

      const images = await Promise.all(
        params.characterReference.map(async (v) =>
          new Uint8Array((await convertToPng(v.image)).buffer)
        ),
      );

      Deno.writeFileSync("./charref.png", images[0]);

      params.characterReference.forEach((v, i) => {
        body.parameters.director_reference_descriptions.push({
          caption: {
            base_caption: v.styleAware ? "character&style" : "character",
            char_captions: [],
          },
          legacy_uc: false,
        });
        body.parameters.director_reference_images.push(encodeBase64(images[i]));
        body.parameters.director_reference_information_extracted.push(1);
        body.parameters.director_reference_strength_values.push(1);
      });
    }
  }

  if (params.viveTransfer) {
    if (
      !isViveTransferAvailable(params.model!) &&
      params.viveTransfer.length > 0
    ) {
      console.info(
        `Vive Transfer is not available for model ${params.model}. Skip to attach reference images.`,
      );
    } else {
      if (params.viveTransfer.length > 0) {
        const images = await Promise.all(
          params.viveTransfer.map(async (v) =>
            "image" in v
              ? new Uint8Array((await convertToPng(v.image)).buffer)
              : v.encodedVibe
          ),
        );

        const strength = params.viveTransfer.map((v) => v.strength);

        if (!isEncodedVibeTransferRequired(params.model!)) {
          const extracted = params.viveTransfer.map((v) =>
            "informationExtracted" in v ? v.informationExtracted : undefined
          );

          body.parameters.reference_information_extracted_multiple = Array.from(
            { length: images.length },
            (_, i) => extracted[i] ?? 1,
          );
        }

        body.parameters.reference_image_multiple = images.map(encodeBase64);
        body.parameters.reference_strength_multiple = Array.from(
          { length: images.length },
          (_, i) => strength[i] ?? 0.6,
        );
      }
    }
  }

  if (params.img2img) {
    body.action = "img2img";
    body.parameters.image = encodeBase64(
      Uint8Array.from((await convertToPng(params.img2img.image)).buffer),
    );

    body.parameters.strength = params.img2img.strength;
    body.parameters.noise = params.img2img.noise;
    body.parameters.extra_noise_seed = params.img2img.noiseSeed ?? params.seed;
  }

  if (params.inpainting) {
    body.action = "infill";
    body.parameters.mask = encodeBase64(
      Uint8Array.from((await convertToPng(params.inpainting.mask)).buffer),
    );
    body.parameters.add_original_image = params.inpainting.addOriginalImage ??
      true;
    body.parameters.inpaintImg2ImgStrength = params.inpainting.strength ?? 1;

    body.parameters.img2img = {
      strength: params.inpainting.strength ?? 1,
      color_correct: false,
    };
  }

  return body;
}

function isV4XModel(model: NovelAIDiffusionModels) {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview ||
    model === NovelAIDiffusionModels.NAIDiffusionV4Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4FullInpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Curated ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5FullInpainting
  );
}

function isV3Model(model: NovelAIDiffusionModels): boolean {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionAnimeV3 ||
    model === NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionFurryV3 ||
    model === NovelAIDiffusionModels.NAIDiffusionFurryV3Inpainting
  );
}

function isSmeaAvailableModel(model: NovelAIDiffusionModels): boolean {
  return !isV4XModel(model);
}

function isCharacterReferenceAvailable(model: NovelAIDiffusionModels): boolean {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Curated ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Full
  );
}

function isViveTransferAvailable(model: NovelAIDiffusionModels): boolean {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionAnimeV3 ||
    model === NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview ||
    model === NovelAIDiffusionModels.NAIDiffusionV4Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4FullInpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Curated ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5FullInpainting
  );
}

function isImageVibeTransferRequired(model: NovelAIDiffusionModels): boolean {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionAnimeV3 ||
    model === NovelAIDiffusionModels.NAIDiffusionAnimeV3Inpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionFurryV3 ||
    model === NovelAIDiffusionModels.NAIDiffusionFurryV3Inpainting
  );
}

function isEncodedVibeTransferRequired(model: NovelAIDiffusionModels): boolean {
  return (
    model === NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview ||
    model === NovelAIDiffusionModels.NAIDiffusionV4Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4FullInpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Curated ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5Full ||
    model === NovelAIDiffusionModels.NAIDiffusionV4_5FullInpainting
  );
}

function isCharacterPromptsAvailable(model: NovelAIDiffusionModels): boolean {
  return isV4XModel(model);
}

function getQualityTags(model: NovelAIDiffusionModels) {
  if (NovelAIImageQualityPresets[model]) {
    return NovelAIImageQualityPresets[model];
  }

  return ", best quality, amazing quality, very aesthetic, absurdres";
}

function getUndesiredQualityTags(
  model: NovelAIDiffusionModels,
  ucPreset: NovelAIImageUCPresetType,
) {
  const modelPresets = NovelAIImageUCPresets[model] as any;

  if (!modelPresets[ucPreset]) {
    console.info(
      `Undesired quality tag "${ucPreset}" not found for model "${model}".`,
    );
  }
  return modelPresets[ucPreset] ?? "";
}
