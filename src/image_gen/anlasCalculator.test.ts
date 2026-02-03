/**
 * Anlas Calculator Tests
 */

import { assertEquals } from "jsr:@std/assert";
import { NovelAIDiffusionModels } from "../high_level/consts.ts";
import { calculateAnlasCost, isFreeGeneration } from "./anlasCalculator.ts";

Deno.test("isFreeGeneration - should return true for free generation settings", () => {
  const freeGenSettings = {
    width: 1024,
    height: 1024,
    steps: 28,
    n_samples: 1,
    characterRef: false,
  };

  assertEquals(isFreeGeneration(freeGenSettings), true);
});

Deno.test("isFreeGeneration - should return false when character reference is used", () => {
  const settings = {
    width: 1024,
    height: 1024,
    steps: 28,
    n_samples: 1,
    characterRef: true,
  };

  assertEquals(isFreeGeneration(settings), false);
});

Deno.test("isFreeGeneration - should return false when resolution exceeds 1024x1024", () => {
  const settings = {
    width: 1536,
    height: 1024,
    steps: 28,
    n_samples: 1,
    characterRef: false,
  };

  assertEquals(isFreeGeneration(settings), false);
});

Deno.test("isFreeGeneration - should return false when steps exceed 28", () => {
  const settings = {
    width: 1024,
    height: 1024,
    steps: 50,
    n_samples: 1,
    characterRef: false,
  };

  assertEquals(isFreeGeneration(settings), false);
});

Deno.test("calculateAnlasCost - free generation for Opus tier", () => {
  const settings = {
    width: 1024,
    height: 1024,
    steps: 28,
    n_samples: 1,
    characterRef: false,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
    true, // hasOpusSub
  );

  assertEquals(cost, 0);
});

Deno.test("calculateAnlasCost - normal generation V4.5 Curated 832x1216", () => {
  const settings = {
    width: 832,
    height: 1216,
    steps: 23,
    n_samples: 1,
    sampler: "k_euler_ancestral",
    sm: false,
    sm_dyn: false,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
    false,
  );

  assertEquals(cost, 17);
});

Deno.test("calculateAnlasCost - large generation 1536x1024", () => {
  const settings = {
    width: 1536,
    height: 1024,
    steps: 28,
    n_samples: 1,
    sm: false,
    sm_dyn: false,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5Full,
    false,
  );

  assertEquals(cost, 30);
});

Deno.test("calculateAnlasCost - SMEA multipliers", () => {
  const baseSettings = {
    width: 1536,
    height: 1536,
    steps: 50,
    n_samples: 1,
    sampler: "k_euler_ancestral",
  };

  assertEquals(
    calculateAnlasCost(
      { ...baseSettings, sm: false, sm_dyn: false },
      NovelAIDiffusionModels.NAIDiffusionAnimeV3,
      false,
    ),
    75,
  );

  assertEquals(
    calculateAnlasCost(
      { ...baseSettings, sm: true, sm_dyn: false },
      NovelAIDiffusionModels.NAIDiffusionAnimeV3,
      false,
    ),
    90,
  );

  assertEquals(
    calculateAnlasCost(
      { ...baseSettings, sm: true, sm_dyn: true },
      NovelAIDiffusionModels.NAIDiffusionAnimeV3,
      false,
    ),
    105,
  );
});

Deno.test("calculateAnlasCost - multiple samples", () => {
  const settings = {
    width: 832,
    height: 1216,
    steps: 23,
    n_samples: 4,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
    false,
  );

  const singleSampleCost = calculateAnlasCost(
    { ...settings, n_samples: 1 },
    NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
    false,
  );

  assertEquals(cost, singleSampleCost * 4);
});

Deno.test("calculateAnlasCost - img2img with strength", () => {
  const settings = {
    width: 832,
    height: 1216,
    steps: 23,
    n_samples: 1,
    sampler: "k_euler_ancestral",
    image: true,
    strength: 0.7,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
    false,
  );

  assertEquals(cost, 12);
});

Deno.test("calculateAnlasCost - inpainting", () => {
  const settings = {
    width: 832,
    height: 1216,
    steps: 23,
    n_samples: 1,
    sampler: "k_euler_ancestral",
    mask: true,
    inpaintImg2ImgStrength: 1.0,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5CuratedInpainting,
    false,
  );

  assertEquals(cost, 17);
});

Deno.test("calculateAnlasCost - V3 model", () => {
  const settings = {
    width: 832,
    height: 1216,
    steps: 28,
    n_samples: 1,
    sampler: "k_euler_ancestral",
    sm: false,
    sm_dyn: false,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionAnimeV3,
    false,
  );

  assertEquals(cost, 20);
});

Deno.test("calculateAnlasCost - minimum cost is always 2", () => {
  const settings = {
    width: 64,
    height: 64,
    steps: 1,
    n_samples: 1,
  };

  const cost = calculateAnlasCost(
    settings,
    NovelAIDiffusionModels.NAIDiffusionV4_5Curated,
    false,
  );

  assertEquals(cost, 2);
});
