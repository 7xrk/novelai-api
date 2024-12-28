import outdent from "outdent";
import { load } from "https://deno.land/std@0.217.0/dotenv/mod.ts";
import {
  NovelAIDiffusionModels,
  NovelAISession,
  generateImage,
  NovelAIImageSizePreset,
  NovelAIImageUCPresetType,
} from "../mod.ts";

const env = await load();

const session = await NovelAISession.login(env["NAI_USER"], env["NAI_PASS"]);

Deno.mkdirSync("./tmp", { recursive: true });

console.log("generating");
const result = await generateImage(session, {
  limitToFreeInOpus: true,
  prompt: outdent`1girl,{{{best quality, amazing quality, very aesthetic}}}`,
  undesiredContent: outdent`worst quality`,
  ucPreset: NovelAIImageUCPresetType.Heavy,
  model: NovelAIDiffusionModels.NAIDiffusionAnimeV3,
  size: NovelAIImageSizePreset.NORMAL_LANDSCAPE,
  smea: { dyn: true },
  // img2img: {
  //   keepAspect: true,
  //   image: Deno.readFileSync("./test.jpeg"),
  //   strength: 0.8,
  // },
});

for (const file of result.files) {
  const bin = await file.arrayBuffer();
  Deno.writeFileSync(`./tmp/test.png`, new Uint8Array(bin));
}
