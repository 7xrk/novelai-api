import { unzip } from "unzipit";
import { apiAiAugmentImage } from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import { safeJsonParse } from "../utils.ts";
import {
  adjustResolution,
  convertToPng,
  nearest64,
  type Size,
} from "./utils.ts";
import {
  NovelAIAugmentImageRequestTypes,
  type NovelAIImageAugmentEmotionType,
} from "./consts.ts";

type AugmentImageResponse = {
  params: Record<string, any>;
  /** png blob */
  image: Blob;
};

type RemoveBGAugmentParam = {
  reqType: typeof NovelAIAugmentImageRequestTypes.removeBg;
};

type EmotionAugmentParam = {
  reqType: typeof NovelAIAugmentImageRequestTypes.emotion;
  emotion: NovelAIImageAugmentEmotionType;
  /** 0 to 5, 5 is weakest */
  defry: number;
  prompt: string;
};

type SketchAugmentParam = {
  reqType: typeof NovelAIAugmentImageRequestTypes.sketch;
};

type LineArtAugmentParam = {
  reqType: typeof NovelAIAugmentImageRequestTypes.lineArt;
};

type ColorizeAugmentParam = {
  reqType: typeof NovelAIAugmentImageRequestTypes.colorize;
  /** 0 to 5, 5 is weakest */
  defry: number;
  prompt: string;
};

export async function augmentImage(
  session: INovelAISession,
  {
    size,
    image,
    limitToFreeInOpus,
    ...params
  }:
    & {
      size: Size;
      image: Blob | Uint8Array;
      limitToFreeInOpus?: boolean;
    }
    & (
      | RemoveBGAugmentParam
      | EmotionAugmentParam
      | SketchAugmentParam
      | LineArtAugmentParam
      | ColorizeAugmentParam
    ),
): Promise<AugmentImageResponse> {
  if (
    params.reqType === NovelAIAugmentImageRequestTypes.removeBg &&
    limitToFreeInOpus
  ) {
    throw new Error(
      "removeBg request type is not supported in opus free generation",
    );
  }

  let { width, height } = size;

  width = nearest64(width);
  height = nearest64(height);

  const png = await convertToPng(image);

  if (limitToFreeInOpus) {
    [width, height] = adjustResolution(width, height, 1024 * 1024);
  }

  const emotionPrefix =
    params.reqType === NovelAIAugmentImageRequestTypes.emotion
      ? `${params.emotion};;`
      : "";

  const defry = params.reqType === NovelAIAugmentImageRequestTypes.colorize ||
      params.reqType === NovelAIAugmentImageRequestTypes.emotion
    ? params.defry
    : 0;

  const prompt = params.reqType === NovelAIAugmentImageRequestTypes.colorize ||
      params.reqType === NovelAIAugmentImageRequestTypes.emotion
    ? `${emotionPrefix}${params.prompt}`
    : "";

  const reqParams = {
    defry,
    width,
    height,
    image: png.buffer,
    prompt,
    reqType: params.reqType,
  };

  const res = await apiAiAugmentImage(session, reqParams);

  if (!res.ok) {
    const body = await res.text();
    const json = safeJsonParse(body);

    if (json.ok && json.result?.message) {
      throw new Error(`Failed to augment image: ${json.result.message}`);
    } else {
      throw new Error("Failed to augment image", {
        cause: new Error(body),
      });
    }
  }

  const entries = Object.entries(
    (await unzip(await res.arrayBuffer())).entries,
  );

  const images = await Promise.all(
    entries.map(async ([, entry]) => {
      return new Blob([await entry.arrayBuffer()], { type: "image/png" });
    }),
  );

  return {
    params: reqParams,
    image: images[0],
  };
}
