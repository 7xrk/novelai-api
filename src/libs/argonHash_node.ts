import blake2b from "npm:blake2b";
import { hash as argon2, argon2id } from "npm:argon2";

export async function argonHash(
  email: string,
  password: string,
  size: number,
  domain: string
): Promise<string> {
  const enc = new TextEncoder();

  // Salt
  const preSalt = `${password.substring(0, 6)}${email}${domain}`;
  const blake = blake2b(16).update(enc.encode(preSalt));
  const salt = blake.digest() as Uint8Array;

  const raw = await argon2(password, {
    salt,
    timeCost: 2,
    memoryCost: 2000000 / 1024,
    type: argon2id,
    parallelism: 1,
    hashLength: size,
    secret: undefined,
    version: 0x13,
    raw: true,
  });

  console.log(raw.toString("base64"));

  return raw.toString("base64");
}
