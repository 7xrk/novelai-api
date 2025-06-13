import outdent from "https://deno.land/x/outdent@v0.8.0/mod.ts";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import { load } from "jsr:@std/dotenv";
import {
  NovelAIDiffusionModels,
  NovelAISession,
  generateImage,
  generateImageStream,
  NovelAIImageSizePreset,
  NovelAIImageUCPresetType,
  encodeVibe,
} from "../mod.ts";

const env = await load();

const session = await NovelAISession.login(env["NAI_USER"], env["NAI_PASS"]);

Deno.mkdirSync("./tmp", { recursive: true });

console.log("generating");
const response = await generateImage(session, {
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

// for await (const event of response) {
//   if (event.type === "data") {
//     Deno.writeFileSync(
//       `./tmp/test.png`,
//       new Uint8Array(decodeBase64(event.data.image))
//     );
//   }
// }

for (const file of response.files) {
  const bin = await file.arrayBuffer();
  Deno.writeFileSync(`./tmp/test.png`, new Uint8Array(bin));
}
