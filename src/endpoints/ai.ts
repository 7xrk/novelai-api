import type {
  NovelAIAugmentImageRequestTypes,
  NovelAIDiffusionModels,
} from "../high_level/consts.ts";
import type { INovelAISession } from "../libs/session.ts";
import { encodeBase64 } from "../utils.ts";

export async function apiAiGenerateImageSuggestTags(
  session: INovelAISession,
  params: {
    model: NovelAIDiffusionModels;
    prompt: string;
    lang?: "jp" | undefined;
  }
): Promise<Response> {
  const searchParams = new URLSearchParams();
  searchParams.set("model", params.model);
  searchParams.set("prompt", params.prompt);
  if (params.lang) searchParams.set("lang", params.lang);

  return await session.req(
    `https://image.novelai.net/ai/generate-image/suggest-tags?${searchParams}`,
    {
      method: "GET",
    }
  );
}

export async function apiAiGenerateImage(
  session: INovelAISession,
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
  session: INovelAISession,
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
  session: INovelAISession,
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
