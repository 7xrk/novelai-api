import { encodeBase64 } from "https://deno.land/std@0.217.0/encoding/base64.ts";
import { Blake2b } from "blake2b";
import { hash as argon2d } from "argontwo";

export async function argonHash(
  email: string,
  password: string,
  size: number,
  domain: string
): Promise<string> {
  // const { hash: argon2 } = await import("argontwo");
  // const { Blake2b } = await import("blake2b");

  const enc = new TextEncoder();

  // Salt
  const preSalt = `${password.substring(0, 6)}${email}${domain}`;
  const blake = new Blake2b(16).update(enc.encode(preSalt));
  const salt = blake.digest() as Uint8Array;

  const raw = argon2d(enc.encode(password), salt, {
    tCost: 2,
    mCost: 2000000 / 1024,
    algorithm: "Argon2id",
    outputLength: size,
    pCost: 1,
    secret: undefined,
    version: 0x13,
  });

  return encodeBase64(raw);
}

export async function getAccessKey(
  email: string,
  password: string
): Promise<string> {
  return (
    await argonHash(email, password, 64, "novelai_data_access_key")
  ).slice(0, 64);
}
