import { apiUserSubscription } from "../endpoints/user.ts";
import type { INovelAISession } from "../libs/session.ts";

export type UserSubscriptionResponse = {
  tier: number;
  active: boolean;
  expiresAt: number;
  perks: {
    maxPriorityActions: number;
    startPriority: number;
    moduleTrainingSteps: number;
    unlimitedMaxPriority: boolean;
    voiceGeneration: boolean;
    imageGeneration: boolean;
    unlimitedImageGeneration: boolean;
    unlimitedImageGenerationLimits: Array<{
      resolution: number;
      maxPrompts: number;
    }>;
    contextTokens: number;
  };
  paymentProcessorData: {
    /** URL of Subscription cancelleation */
    c: string;
    n: number;
    o: string;
    p: string;
    r: string;
    s: string;
    t: number;
    /** URL of Subscription update */
    u: string;
  };
  trainingStepsLeft: {
    fixedTrainingStepsLeft: number;
    purchasedTrainingSteps: number;
  };
  accountType: number;
  isGracePeriod: boolean;
};

export async function userSubscription(
  session: INovelAISession,
): Promise<UserSubscriptionResponse> {
  const res = await apiUserSubscription(session);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get user subscription: ${body}`);
  }

  return await res.json();
}
