import type { INovelAISession } from "../libs/session.ts";
import {
  generateImage,
  type GenerateImageResponse,
  type GenerateImageArgs,
} from "./generateImage.ts";
import { loadImage } from "./utils.ts";

export async function enhanceImage(
  session: INovelAISession,
  input: Exclude<GenerateImageArgs["img2img"], void> & { scaleBy: number },
  { size, ...params }: Omit<GenerateImageArgs, "img2img" | "enhanceImg">
): Promise<GenerateImageResponse> {
  if (!size) {
    const img = await loadImage(input.image);

    size = {
      width: img.width * input.scaleBy,
      height: img.height * input.scaleBy,
    };
  }

  return generateImage(session, {
    ...params,
    size,
    img2img: {
      image: input.image,
      strength: input.strength,
      keepAspect: input.keepAspect,
      noise: input.noise,
      noiseSeed: input.noiseSeed,
    },
  });
}
