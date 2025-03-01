import { apiAiGenerateImageSuggestTags } from "../endpoints/ai.ts";
import type { INovelAISession } from "../libs/session.ts";
import { safeJsonParse } from "../utils.ts";
import type { NovelAIDiffusionModels } from "./consts.ts";

type JpResponse = Array<{ jp_tag: string; en_tag: string; power: number }>;
type EnResponse = {
  tags: Array<{ tag: string; confidence: number; count: number }>;
};

const UNICODE_REGEX =
  /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/;

export type SuggestTagsResponse = Array<{
  tag: string;
  jp_tag: string | undefined;
}>;

export async function suggestTags(
  session: INovelAISession,
  params: {
    model: NovelAIDiffusionModels;
    prompt: string;
  }
): Promise<SuggestTagsResponse> {
  const hasJaString = UNICODE_REGEX.test(params.prompt);

  const res = await apiAiGenerateImageSuggestTags(session, {
    ...params,
    lang: hasJaString ? "jp" : undefined,
  });

  if (!res.ok) {
    const body = await res.text();
    const json = safeJsonParse(body);
    throw new Error(json.ok ? json.result.message : body);
  }

  const body: JpResponse | EnResponse = await res.json();

  if ("tags" in body) {
    return body.tags
      .sort((a, b) => a.confidence - b.confidence)
      .map((tag) => ({ tag: tag.tag, jp_tag: undefined }));
  } else {
    return body
      .sort((a, b) => a.power - b.power)
      .map((tag) => ({ tag: tag.en_tag, jp_tag: tag.jp_tag }));
  }
}
