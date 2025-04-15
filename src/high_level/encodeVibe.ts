import { apiAiEncodeVibe } from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import { encodeBase64, safeJsonParse } from "../utils.ts";
import { convertToPng, resizeImage } from "./utils.ts";
import { NovelAIDiffusionModels } from "./consts.ts";

export type EncodedVibe = {
  identifier: string;
  version: number;
  type: "encoding" | "image";
  image?: string;
  id: string;
  encodings: Record<
    string,
    {
      [key: string]: {
        encoding: string;
        params: {
          information_extracted: number;
        };
      };
    }
  >;
  name: string;
  thumbnail?: string;
  createdAt: number;
  importInfo: {
    model: string;
    information_extracted: number;
    strength: number;
  };
};

/**
 * Generate Encoded vibe (.naiv4vibe) from a image
 */
export async function encodeVibe(
  session: INovelAISession,
  {
    image,
    informationExtracted,
    model,
  }: {
    /** raw png binary */
    image: Uint8Array;
    informationExtracted: number;
    model: NovelAIDiffusionModels;
  }
): Promise<{
  vibe: EncodedVibe;
}> {
  const png = await convertToPng(image);
  const pngBase64 = encodeBase64(png.buffer);

  const res = await apiAiEncodeVibe(session, {
    image: png.buffer,
    information_extracted: informationExtracted,
    model,
  });

  const id = await sha256(pngBase64);

  const vibe = {
    identifier: "novelai-vibe-transfer",
    version: 1,
    type: "image",
    image: pngBase64,
    id,
    encodings: {} as Record<string, any>,
    name: `${id.slice(0, 6)}-${id.slice(-6)}`,
    thumbnail:
      "data:image/png;base64," +
      encodeBase64(await resizeImage(image, { width: 256, height: 256 })),
    createdAt: Date.now(),
    importInfo: {
      model: model,
      information_extracted: informationExtracted,
      strength: 0.8,
    },
  } satisfies EncodedVibe;

  if (!res.ok) {
    const body = await res.text();
    const json = safeJsonParse(body);

    if (json.ok && json.result?.message) {
      throw new Error(json.result.message);
    } else {
      throw new Error("Failed to upscale image", { cause: new Error(body) });
    }
  }

  vibe.encodings[getEncodingKey(model)] = {
    [await toVibeHash({
      information_extracted: 1,
      mask: undefined,
    })]: {
      encoding: encodeBase64(await res.arrayBuffer()),
      params: {
        information_extracted: informationExtracted,
      },
    },
  };

  return { vibe };
}

/**
 * Make a bundle of vibes (.naiv4vibebundle)
 */
export function bundleVibes(vibes: EncodedVibe[]): {
  identifier: string;
  version: number;
  vibes: EncodedVibe[];
} {
  return {
    identifier: "novelai-vibe-transfer-bundle",
    version: 1,
    vibes: [...vibes],
  };
}

function getEncodingKey(e: NovelAIDiffusionModels | string): string {
  switch (e) {
    case NovelAIDiffusionModels.NAIDiffusionV4CuratedPreview:
      return "v4curated";
    case NovelAIDiffusionModels.NAIDiffusionV4Full:
      return "v4full";
    case "custom":
      return "custom";
  }
  throw Error(`Unknown model name: ${e}`);
}

function toVibeHash(e: Record<string, any>) {
  return sha256(
    Object.entries(e)
      .sort()
      .filter((e) => {
        let [t, i] = e;
        return null != i;
      })
      .map((e) => {
        let [t, i] = e;
        return "object" == typeof i ? `${t}:${JSON.stringify(i)}` : `${t}:${i}`;
      })
      .join(",")
  );
}

function sha256(e: string) {
  const encoder = new TextEncoder().encode(e);
  return crypto.subtle
    .digest("SHA-256", encoder)
    .then((e) =>
      [...new Uint8Array(e)]
        .map((e) => e.toString(16).padStart(2, "0"))
        .join("")
    );
}
