import { unzip } from "unzipit";
import { apiAiAugmentImage } from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import { safeJsonParse } from "../utils.ts";
import {
  type Size,
  adjustResolution,
  convertToPng,
  nearest64,
} from "./utils.ts";
import {
  NovelAIAugmentImageRequestTypes,
  type NovelAIImageAugmentEmotionType,
} from "./consts.ts";

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
  }: {
    size: Size;
    image: Blob | Uint8Array;
    limitToFreeInOpus?: boolean;
  } & (
    | EmotionAugmentParam
    | SketchAugmentParam
    | LineArtAugmentParam
    | ColorizeAugmentParam
  )
): Promise<{ images: Blob[] }> {
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

  const defry =
    params.reqType === NovelAIAugmentImageRequestTypes.colorize ||
    params.reqType === NovelAIAugmentImageRequestTypes.emotion
      ? params.defry
      : 0;

  const prompt =
    params.reqType === NovelAIAugmentImageRequestTypes.colorize ||
    params.reqType === NovelAIAugmentImageRequestTypes.emotion
      ? `${emotionPrefix}${params.prompt}`
      : "";

  const res = await apiAiAugmentImage(session, {
    defry,
    width,
    height,
    image: png.buffer,
    prompt,
    reqType: params.reqType,
  });

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
    (await unzip(await res.arrayBuffer())).entries
  );

  const images = await Promise.all(
    entries.map(async ([, entry]) => {
      return new Blob([await entry.arrayBuffer()], { type: "image/png" });
    })
  );

  return { images };
}
