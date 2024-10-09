import type { NovelAISession } from "../libs/session.ts";
import { encodeBase64, rescue } from "../utils.ts";

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
    const json = rescue(() => JSON.parse(body));
    throw new Error(json.ok ? json.result.message : body);
  }

  return await res.json();
}

export async function apiAiGenerateImage(
  session: NovelAISession,
  body: object
): Promise<Response> {
  return await session.req("https://image.novelai.net/ai/generate-image", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
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
): Promise<Response> {
  return await session.req("https://image.novelai.net/ai/augment-image", {
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
): Promise<Response> {
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
