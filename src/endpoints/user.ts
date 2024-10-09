import type { NovelAISession } from "../libs/session.ts";

export async function subscription(session: NovelAISession) {
  return (await session.req("/user/subscription")).json();
}
