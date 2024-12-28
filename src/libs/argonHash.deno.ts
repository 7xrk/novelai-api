import Blake2b from "@rabbit-company/blake2b";
import { hash as argon2d } from "@denosaurs/argontwo";
import { encodeBase64 } from "../utils.ts";
import { decodeHex } from "@std/encoding/hex";

export function argonHash(
  email: string,
  password: string,
  size: number,
  domain: string
): Promise<string> {
  const enc = new TextEncoder();

  // Salt
  const preSalt = `${password.substring(0, 6)}${email}${domain}`;
  const salt = Blake2b.hash(preSalt, undefined, 16, undefined, undefined);

  const raw = argon2d(enc.encode(password), decodeHex(salt), {
    tCost: 2,
    mCost: 2000000 / 1024,
    algorithm: "Argon2id",
    outputLength: size,
    pCost: 1,
    secret: undefined,
    version: 0x13,
  });

  return Promise.resolve(encodeBase64(raw));
}

export async function getAccessKey(
  email: string,
  password: string
): Promise<string> {
  return (
    await argonHash(email, password, 64, "novelai_data_access_key")
  ).slice(0, 64);
}
