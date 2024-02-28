import { argonHash } from "./argonHash_deno.ts";

const endpoint = (path: string | URL) =>
  new URL(path, "https://api.novelai.net");

export class NovelAISession {
  protected accessToken: string | null = null;

  constructor({ accessToken }: { accessToken?: string } = {}) {
    this.accessToken = accessToken ?? null;
  }

  public async login(email: string, password: string) {
    const accessKey = await getAccessKey(email, password);
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

  public req(path: string | URL, init?: RequestInit) {
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
}

export async function getAccessKey(
  email: string,
  password: string
): Promise<string> {
  return (
    await argonHash(email, password, 64, "novelai_data_access_key")
  ).slice(0, 64);
}
