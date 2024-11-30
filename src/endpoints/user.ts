import type { INovelAISession } from "../libs/session.ts";

export async function subscription(session: INovelAISession) {
  return (await session.req("/user/subscription")).json();
}
