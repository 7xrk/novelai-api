# novelai-api [![JSR](https://jsr.io/badges/@7xrk/novelai-api)](https://jsr.io/@7xrk/novelai-api)

NovelAI Image Generation API Client for Deno and Node.js

## Status

Supports NovelAI Image Generation API v3 to v4.5

## Example

### Image Generation Example

```typescript
import { generateImage, NovelAISession } from "jsr:@7xrk/novelai-api";

const session = await NovelAISession.login("email", "password");
// or `new NovelAISession({ accessToken: 'token' })`

// Text to Image
const result = await generateImage(session, {
  limitToFreeInOpus: true,
  model: NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
  size: NovelAIImageSizePreset.NORMAL_LANDSCAPE,
  prompt: "A beautiful sunset over the ocean",
  undesiredContent: "very displeasing",
  ucPreset: NovelAIImageUCPresetType.Heavy,
  smea: { dyn: true }, // SMEA ignored if unsupported by the model
  nSamples: 1,
});

// Image to Image
const result = await generateImage(session, {
  limitToFreeInOpus: true,
  model: NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
  size: NovelAIImageSizePreset.NORMAL_LANDSCAPE,
  prompt: "A beautiful sunset over the ocean",
  undesiredContent: "very displeasing",
  ucPreset: NovelAIImageUCPresetType.Heavy,
  smea: { dyn: true }, // SMEA ignored if unsupported by the model
  nSamples: 1,
  img2img: {
    image: Deno.readFileSync("input.jpg"),
    strength: 0.5,
  },
});

result.files.forEach((file, i) => {
  const buffer = await file.arrayBuffer();
  Deno.writeFileSync(`output-${i}.png`, new Uint8Array(buffer));
});
```

### Upscale Image Example

```typescript
import { upscaleImage, NovelAISession } from "jsr:@7xrk/novelai-api";

const session = await NovelAISession.login("email", "password");
// or `new NovelAISession({ accessToken: 'token' })`

const result = await upscaleImage(session, {
  image: Deno.readFileSync("input.jpg"),
  scaleBy: 2,
});

Deno.writeFileSync(
  "output.png",
  new Uint8Array(await result.image.arrayBuffer()),
);
```
