import { unzip } from "unzipit";
import { apiAiUpscale } from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import { safeJsonParse } from "../utils.ts";
import { convertToPng } from "./utils.ts";

export async function upscaleImage(
  session: INovelAISession,
  {
    image,
    scale,
  }: {
    /** NovelAI generated raw png binary */
    image: Uint8Array;
    scale: number;
  }
): Promise<{
  image: Blob;
}> {
  if (scale !== 2 && scale !== 4) {
    throw new Error(`Invalid scale, expected 2 or 4 but got ${scale}`);
  }

  const png = await convertToPng(image);

  const res = await apiAiUpscale(session, {
    image,
    width: png.imageSize.width,
    height: png.imageSize.height,
    scale,
  });

  if (!res.ok) {
    const body = await res.text();
    const json = safeJsonParse(body);

    if (json.ok && json.result?.message) {
      throw new Error(json.result.message);
    } else {
      throw new Error("Failed to upscale image", { cause: new Error(body) });
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

  return {
    image: images[0],
  };
}
