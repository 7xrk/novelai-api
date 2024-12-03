import type { INovelAISession } from "../libs/session.ts";

export async function apiUserSubscription(
  session: INovelAISession
): Promise<Response> {
  return (await session.req("/user/subscription")).json();
}
