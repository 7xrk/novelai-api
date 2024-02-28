import { NovelAISession } from '../session';

export async function subscription(session: NovelAISession) {
  return (await session.req('/user/subscription')).json();
}
