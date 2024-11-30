import type { NovelAISession } from "../libs/session.ts";
import {
  generateImage,
  type GenerateImageResponse,
  type GenerateImageArgs,
} from "./generateImage.ts";

export function enhanceImage(
  session: NovelAISession,
  img: Exclude<GenerateImageArgs["enhanceImg"], void>,
  params: Omit<GenerateImageArgs, "img2img" | "enhanceImg">
): Promise<GenerateImageResponse> {
  return generateImage(session, {
    ...params,
    enhanceImg: img,
  });
}
