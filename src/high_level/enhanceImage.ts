import type { INovelAISession } from "../libs/session.ts";
import {
  generateImage,
  type GenerateImageResponse,
  type GenerateImageArgs,
} from "./generateImage.ts";
import { loadImage } from "./utils.ts";

export async function enhanceImage(
  session: INovelAISession,
  input: Exclude<GenerateImageArgs["enhanceImg"], void>,
  { size, ...params }: Omit<GenerateImageArgs, "img2img" | "enhanceImg">
): Promise<GenerateImageResponse> {
  if (!size) {
    const img = await loadImage(input.image);

    size = {
      width: img.width,
      height: img.height,
    };
  }

  return generateImage(session, {
    ...params,
    size,
    enhanceImg: input,
  });
}
