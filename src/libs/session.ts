import type { ArgonHashFn } from "./argonHash.deno.ts";

const endpoint = (path: string | URL) =>
  new URL(path, "https://api.novelai.net");

export function createNovelAISessionClass(
  argonHashImpl: ArgonHashFn
): NovelAISessionClass {
  return class NovelAISessionImpl extends NovelAISession {
    protected argonHash = argonHashImpl;
  };
}

export interface NovelAISessionClass {
  new (params?: { accessToken?: string }): INovelAISession;
}

export interface INovelAISession {
  // new({ accessToken }?: { accessToken?: string }): INovelAISession;
  login(
    email: string,
    password: string
  ): Promise<{ accessToken: string | null }>;
  req(path: string | URL, init?: RequestInit): Promise<Response>;
}

export abstract class NovelAISession implements INovelAISession {
  protected accessToken: string | null = null;
  protected abstract argonHash: ArgonHashFn;

  constructor({ accessToken }: { accessToken?: string } = {}) {
    this.accessToken = accessToken ?? null;
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ accessToken: string | null }> {
    const accessKey = await this.getAccessKey(email, password);
    console.log({ accessKey });

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
    this.accessToken = body.accessToken;

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
    password: string
  ): Promise<string> {
    return (
      await this.argonHash(email, password, 64, "novelai_data_access_key")
    ).slice(0, 64);
  }
}
