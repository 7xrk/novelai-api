import { argonHash } from "./argonHash.deno.ts";

const endpoint = (path: string | URL) =>
  new URL(path, "https://api.novelai.net");

export interface INovelAISession {
  // new({ accessToken }?: { accessToken?: string }): INovelAISession;
  login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string | null }>;
  req(path: string | URL, init?: RequestInit): Promise<Response>;
}

export class NovelAISession implements INovelAISession {
  #accessToken: string | null = null;

  constructor({ accessToken }: { accessToken?: string } = {}) {
    this.#accessToken = accessToken ?? null;
  }

  public static async login(
    email: string,
    password: string,
  ): Promise<INovelAISession> {
    const session = new NovelAISession();
    await session.login(email, password);
    return session;
  }

  public get accessToken(): string | null {
    return this.#accessToken;
  }

  public async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string | null }> {
    const accessKey = await this.getAccessKey(email, password);

    const res = await fetch(endpoint("/user/login"), {
      method: "POST",
      body: JSON.stringify({ key: accessKey }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(await res.text());
      throw new Error("Login failed");
    }

    const body = await res.json();
    this.#accessToken = body.accessToken;

    return { accessToken: this.accessToken };
  }

  public req(path: string | URL, init?: RequestInit): Promise<Response> {
    if (!this.accessToken) {
      throw new Error("Not logged in");
    }

    return fetch(endpoint(path), {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  protected async getAccessKey(
    email: string,
    password: string,
  ): Promise<string> {
    return (
      await argonHash(email, password, 64, "novelai_data_access_key")
    ).slice(0, 64);
  }
}
