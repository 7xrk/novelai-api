import { NovelAISession } from "../libs/session.ts";
import { unzip } from "npm:unzipit";
import { encodeBase64 } from "https://deno.land/std@0.217.0/encoding/base64.ts";

export const NovelAIDiffusionModels = {
  NAIDiffusionAnimeV3: "nai-diffusion-3",
  NAIDiffusionAnimeV3Inpainting: "nai-diffusion-3-inpainting",
} as const;
export type NovelAIDiffusionModels =
  (typeof NovelAIDiffusionModels)[keyof typeof NovelAIDiffusionModels];

export const NovelAIImageSamplers = {
  Euler: "k_euler",
  EulerAncestral: "k_euler_ancestral",
};
export type NovelAIImageSamplers =
  (typeof NovelAIImageSamplers)[keyof typeof NovelAIImageSamplers];

export const NovelAIAugmentImageRequestTypes = {
  sketch: "sketch",
  lineArt: "lineart",
  emotion: "emotion",
  colorize: "colorize",
} as const;
export type NovelAIAugmentImageRequestTypes =
  (typeof NovelAIAugmentImageRequestTypes)[keyof typeof NovelAIAugmentImageRequestTypes];

type GenerateImageParams = {
  action: "generate" | "img2img" | "infill";
  input: string;
  model: NovelAIDiffusionModels;
  /** Prompt Guidance Rescale */
  cfgRescale: number;
  controlnetStrength: number;
  dynamicThresholding: boolean;
  nSamples: number;
  legacy: boolean;
  legacyV3Extend: boolean;

  noiseSchedule: "native";
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

/** for resolution value */
export function nearest64(n: number) {
  return Math.floor(n / 64) * 64;
}

export async function apiAiGenerateImageSuggestTags(
  session: NovelAISession,
  params: {
    model: NovelAIDiffusionModels;
    prompt: string;
  }
): Promise<{
  tags: {
    tag: string;
    confidence: number;
    count: number;
  }[];
}> {
  const searchParams = new URLSearchParams();
  searchParams.set("model", params.model);
  searchParams.set("prompt", params.prompt);

  const res = await session.req(
    `/ai/generate-image/suggest-tags?${searchParams}`,
    {
      method: "GET",
    }
  );

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

  return await res.json();
}

export async function apiAiGenerateImage(
  session: NovelAISession,
  params:
    | Partial<Text2ImageParams>
    | Partial<Image2ImageParams>
    | Partial<InpaintParams>
): Promise<{ params: Record<string, any>; files: Blob[] }> {
  const body: Record<string, any> = {
    action: "generate",
    input: params.input ?? "",
    model: params.model ?? NovelAIDiffusionModels.NAIDiffusionAnimeV3,
    parameters: {
      cfg_rescale: params.cfgRescale ?? 0,
      controlnet_strength: params.controlnetStrength ?? 1,
      dynamic_thresholding: params.dynamicThresholding ?? true,
      legacy: params.legacy ?? false,
      legacy_v3_extend: params.legacyV3Extend ?? false,
      n_samples: params.nSamples ?? 1,
      negative_prompt: params.negativePrompt ?? "",
      params_version: 1,
      uncond_scale: params.uncondScale ?? 1,
      noise_schedule: params.noiseSchedule ?? "native",
      qualityToggle: params.qualityToggle ?? false,
      sampler: params.sampler ?? "k_euler",
      scale: params.scale ?? 5,
      seed: parseInt((params.seed ?? 0).toString().slice(0, 10)),
      sm: params.sm ?? false,
      sm_dyn: params.smDyn ?? false,
      steps: params.steps ?? 28,
      width: nearest64(params.width ?? 512),
      height: nearest64(params.height ?? 512),
    },
  };

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
    body.parameters.extra_noise_seed = parseInt(
      (params.extraNoiseSeed ?? 0).toString().slice(0, 10)
    );
  }

  if ("mask" in params && params.mask) {
    body.action = "infill";
    body.parameters.mask = encodeBase64(params.mask);
    body.parameters.add_original_image = params.addOriginalImage ?? true;
  }

  const res = await session.req("https://image.novelai.net/ai/generate-image", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
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

  const bin = await res.blob();
  const entries = Object.entries(
    (await unzip(await bin.arrayBuffer())).entries
  );

  const images: Blob[] = [];
  for (const [, entry] of entries) {
    images.push(new Blob([await entry.arrayBuffer()], { type: "image/png" }));
  }

  return { params: body, files: images };
}

export async function apiAiAugmentImage(
  session: NovelAISession,
  {
    defry,
    width,
    height,
    image,
    prompt,
    reqType,
  }: {
    defry?: number;
    width: number;
    height: number;
    image: Uint8Array;
    prompt?: string;
    reqType: NovelAIAugmentImageRequestTypes;
  }
) {
  return await session.req("/ai/augment-image", {
    method: "POST",
    body: JSON.stringify({
      defty: defry,
      width,
      height,
      image: encodeBase64(image),
      prompt,
      req_type: reqType,
    }),
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
    },
  });
}

export async function apiAiUpscale(
  session: NovelAISession,
  {
    image,
    width,
    height,
    scale,
  }: {
    image: Uint8Array;
    width: number;
    height: number;
    scale: number;
  }
) {
  return await session.req("/ai/upscale", {
    method: "POST",
    body: JSON.stringify({
      image: encodeBase64(image),
      width,
      height,
      scale,
    }),
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
    },
  });
}
