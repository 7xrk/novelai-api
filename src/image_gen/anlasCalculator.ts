/**
 * NovelAI Anlas Cost Calculator
 * Extracted from NovelAI web application
 */

import type { NovelAIDiffusionModels } from "../high_level/consts.ts";

export interface ImageGenSettings {
  width: number;
  height: number;
  steps: number;
  n_samples: number;
  sampler?: string;
  sm?: boolean; // SMEA
  sm_dyn?: boolean; // SMEA DYN
  strength?: number; // for img2img
  mask?: boolean; // for inpainting
  image?: boolean; // for img2img
  characterRef?: boolean; // character reference
  inpaintImg2ImgStrength?: number;
}

function isV4Model(model: NovelAIDiffusionModels): boolean {
  return (
    model === "nai-diffusion-4-curated-preview" ||
    model === "nai-diffusion-4-curated-inpainting" ||
    model === "nai-diffusion-4-full" ||
    model === "nai-diffusion-4-full-inpainting" ||
    model === "nai-diffusion-4-5-curated" ||
    model === "nai-diffusion-4-5-curated-inpainting" ||
    model === "nai-diffusion-4-5-full" ||
    model === "nai-diffusion-4-5-full-inpainting"
  );
}

function isV3Model(model: NovelAIDiffusionModels): boolean {
  return (
    model === "nai-diffusion-3" ||
    model === "nai-diffusion-3-inpainting" ||
    model === "nai-diffusion-furry-3" ||
    model === "nai-diffusion-furry-3-inpainting"
  );
}

/**
 * Check if generation qualifies for free tier (Opus tier 3+)
 * - No character reference
 * - Resolution <= 1024x1024
 * - Steps <= 28
 */
export function isFreeGeneration(settings: ImageGenSettings): boolean {
  return (
    !settings.characterRef &&
    settings.width * settings.height <= 1048576 &&
    settings.steps <= 28
  );
}

/**
 * Calculate base cost for SDXL/V4 models
 */
function calculateSDXLV4Cost(
  width: number,
  height: number,
  steps: number,
  sm: boolean,
  sm_dyn: boolean,
): number {
  const pixels = width * height;
  const baseCost = Math.ceil(
    2951823174884865e-21 * pixels +
      5753298233447344e-22 * pixels * steps,
  );

  // SMEA multipliers
  const multiplier = sm_dyn ? 1.4 : sm ? 1.2 : 1;

  return baseCost * multiplier;
}

/**
 * Calculate base cost for legacy models (< V3)
 */
function calculateLegacyCost(
  width: number,
  height: number,
  steps: number,
): number {
  return (
    (15.266497014243718 *
        Math.exp((width * height) / 1048576 * 0.6326248927474729) +
      -15.225164493059737) /
    28 *
    steps
  );
}

/**
 * Calculate Anlas cost for image generation
 * @param settings Image generation settings
 * @param model NovelAI diffusion model being used
 * @param hasOpusSub Whether user has Opus (tier 3+) subscription
 * @returns Anlas cost (negative values indicate errors)
 */
export function calculateAnlasCost(
  settings: ImageGenSettings,
  model: NovelAIDiffusionModels,
  hasOpusSub: boolean = false,
): number {
  const { width, height, steps, n_samples } = settings;

  let pixels = width * height;
  if (pixels < 65536) {
    pixels = 65536;
  }

  // Determine strength multiplier
  const strength = settings.mask
    ? settings.inpaintImg2ImgStrength ?? 1
    : settings.image
    ? settings.strength ?? 1
    : 1;

  // Adjust sample count for free generation
  let samples = n_samples;
  if (isFreeGeneration(settings) && hasOpusSub) {
    samples -= 1;
  }

  // Calculate base cost based on model
  let baseCost = 0;

  if (isV4Model(model)) {
    // V4/V4.5 models don't support SMEA
    baseCost = calculateSDXLV4Cost(width, height, steps, false, false);
  } else if (isV3Model(model)) {
    // V3 models use SDXL calculation
    const sm = settings.sm ?? false;
    const sm_dyn = settings.sm_dyn ?? false;
    baseCost = calculateSDXLV4Cost(width, height, steps, sm, sm_dyn);
  } else if (
    pixels <= 1048576 &&
    ["plms", "ddim", "k_euler", "k_euler_ancestral", "k_lms"].includes(
      settings.sampler ?? "",
    )
  ) {
    // Legacy calculation for older models
    baseCost = calculateLegacyCost(width, height, steps);
  } else {
    // Fallback
    const sm = settings.sm ?? false;
    const sm_dyn = settings.sm_dyn ?? false;
    baseCost = calculateSDXLV4Cost(width, height, steps, sm, sm_dyn);
  }

  // Apply strength multiplier and minimum cost
  const costPerSample = Math.max(Math.ceil(baseCost * strength), 2);

  // Total cost
  const totalCost = costPerSample * samples;

  // Check if cost exceeds maximum (value from g.dZ, not extracted)
  // If exceeded, returns -3

  return totalCost;
}
