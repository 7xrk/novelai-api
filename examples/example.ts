import outdent from "outdent";
import { load } from "https://deno.land/std@0.217.0/dotenv/mod.ts";
import {
  NovelAIDiffusionModels,
  NovelAISession,
  generateImage,
  NovelAIImageSizePreset,
  NovelAIImageUCPresetType,
  encodeVibe,
} from "../mod.ts";

const env = await load();

const session = await NovelAISession.login(env["NAI_USER"], env["NAI_PASS"]);

Deno.mkdirSync("./tmp", { recursive: true });

console.log("generating");
const result = await generateImage(session, {
  limitToFreeInOpus: true,
  prompt: outdent`2girls`,
  characterPrompts: {
    useCoords: false,
    useOrder: false,
    captions: [{ prompt: "girl, red hair" }, { prompt: "girl, blue hair" }],
  },
  undesiredContent: outdent`worst quality`,
  ucPreset: NovelAIImageUCPresetType.Heavy,
  model: NovelAIDiffusionModels.NAIDiffusionV4_5Full,
  size: NovelAIImageSizePreset.NORMAL_LANDSCAPE,
  smea: { auto: false },
  // img2img: {
  //   keepAspect: true,
  //   image: Deno.readFileSync("./tmp/test.png"),
  //   strength: 0.8,
  // },
});

for (const file of result.files) {
  const bin = await file.arrayBuffer();
  Deno.writeFileSync(`./tmp/test.png`, new Uint8Array(bin));
}
