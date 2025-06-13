export { encodeBase64 } from "@std/encoding/base64";

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

export const responseToEventStream = (res: Response) => {
  return new ReadableStream<{
    type: "event" | "data";
    data: string;
  }>({
    async start(controller) {
      const decoder = new TextDecoder();

      let currentType = "";
      let currentChunk = "";

      for await (const value of res.body!) {
        const decoded = decoder.decode(value);
        const lines = decoded.split("\n").filter((line) => line.trim() !== "");

        lines.forEach((line) => {
          const [eventType, data] = line.split(": ", 2).map((v) => v.trim());

          if (
            eventType !== "error" &&
            eventType !== "event" &&
            eventType !== "data"
          ) {
            currentChunk += decoded;
            return;
          } else {
            if (currentType !== eventType) {
              controller.enqueue({
                type: currentType as "event" | "data",
                data: currentChunk,
              });

              currentType = eventType;
              currentChunk = data || "";
            }
          }
        });
      }

      if (currentType || currentChunk) {
        controller.enqueue({
          type: currentType as "event" | "data",
          data: currentChunk,
        });
      }

      controller.close();
    },
  });
};
