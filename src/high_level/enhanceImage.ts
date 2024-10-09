import type { NovelAISession } from "../libs/session.ts";
import { generateImage, type GenerateImageArgs } from "./generateImage.ts";

export function enhanceImage(
  session: NovelAISession,
  img: Exclude<GenerateImageArgs["enhanceImg"], void>,
  params: Omit<GenerateImageArgs, "img2img" | "enhanceImg">
) {
  return generateImage(session, {
    ...params,
    enhanceImg: img,
  });
}
