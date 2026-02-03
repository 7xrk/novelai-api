import { outdent } from "outdent";
import { config } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  generateImage,
  NovelAIDiffusionModels,
  NovelAIImageSizePreset,
  NovelAIImageUCPresetType,
  NovelAISession,
} from "@7xrk/novelai-api";

const env = config({ path: "../.env" }).parsed!;

const session = await NovelAISession.login(env["NAI_USER"], env["NAI_PASS"]);

mkdir("./tmp", { recursive: true });

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
  smea: { dyn: true },
  // img2img: {
  //   keepAspect: true,
  //   image: Deno.readFileSync("./tmp/test.png"),
  //   strength: 0.8,
  // },
});

for (const file of result.files) {
  const bin = await file.arrayBuffer();
  await writeFile(`./tmp/test.png`, new Uint8Array(bin));
}
