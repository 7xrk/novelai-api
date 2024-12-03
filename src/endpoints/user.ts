import type { INovelAISession } from "../libs/session.ts";

export async function apiUserSubscription(session: INovelAISession) {
  return (await session.req("/user/subscription")).json();
}
