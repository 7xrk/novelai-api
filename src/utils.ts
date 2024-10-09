const encoder = new TextEncoder();

function validateBinaryLike(source: unknown) {
  if (typeof source === "string") return encoder.encode(source);
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  throw new Error("Invalid input type");
}

export function encodeBase64(data: ArrayBuffer | Uint8Array | string): string {
  const uint8 = validateBinaryLike(data);
  let chars = "";
  for (let i = 0; i < uint8.length; i++) {
    chars += String.fromCharCode(uint8[i]);
  }
  return btoa(chars);
}

type Result<T, E = unknown> =
  | ({
      ok: true;
      result: T;
      error: null;
    } & readonly [result: T, error: null])
  | ({
      ok: false;
      result: null;
      error: E;
    } & readonly [result: null, error: E]);

export const rescue: {
  <T>(proc: () => Promise<T>): Promise<Result<T>>;
  <T>(proc: () => T): Result<T>;
  <T>(proc: () => T | Promise<T>): Promise<Result<T>> | Result<T>;
  // deno-lint-ignore no-explicit-any
} = (fn): any => {
  // deno-lint-ignore no-explicit-any
  const createResult = (result: any = null, error: any = null): Result<any> =>
    Object.assign([result, error] as const, {
      ok: error == null,
      result,
      error,
    });

  try {
    const result = fn();

    if (result instanceof Promise) {
      return new Promise((resolve) => {
        result
          .then((r) => {
            resolve(createResult(r));
          })
          .catch((e) => {
            resolve(createResult(null, e));
          });
      });
    }

    return createResult(result);
  } catch (e) {
    return createResult(null, e);
  }
};

// deno-lint-ignore no-explicit-any
export const safeJsonParse = <T = any>(json: string): Result<T> => {
  return rescue(() => JSON.parse(json));
};
