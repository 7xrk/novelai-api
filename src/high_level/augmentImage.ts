import {
  NovelAIAugmentImageRequestTypes,
  apiAiAugmentImage,
  nearest64,
} from "../endpoints/ai.ts";
import { NovelAISession } from "../libs/session.ts";
import { Size, adjustResolution, convertToPng } from "./utils.ts";
export const NovelAIImageAugmentEmotionType = {
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

export type NovelAIImageAugmentEmotionType =
  (typeof NovelAIImageAugmentEmotionType)[keyof typeof NovelAIImageAugmentEmotionType];
export { type NovelAIAugmentImageRequestTypes };

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
  session: NovelAISession,
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
) {
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

  return apiAiAugmentImage(session, {
    defry,
    width,
    height,
    image: png.buffer,
    prompt,
    reqType: params.reqType,
  });
}
