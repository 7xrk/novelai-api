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
      let invalidLines: string[] = [];

      for await (const value of res.body!) {
        const decoded = decoder.decode(value);
        const lines = decoded.split("\n").filter((line) => line !== "");

        lines.forEach((line) => {
          const colonIndex = line.indexOf(": ");

          // Lines without ": "
          if (colonIndex === -1) {
            if (currentType) {
              // Continuation line
              currentChunk += line.trim();
            } else {
              // Invalid line before any event
              invalidLines.push(line.trim());
            }
            return;
          }

          const eventType = line.substring(0, colonIndex).trim();
          const data = line.substring(colonIndex + 2);

          // Valid event types
          if (
            eventType === "error" ||
            eventType === "event" ||
            eventType === "data"
          ) {
            if (currentType !== eventType) {
              // Emit previous event if exists
              if (currentType) {
                controller.enqueue({
                  type: currentType as "event" | "data",
                  data: currentChunk,
                });
              }
              currentType = eventType;
              currentChunk = data;

              // Add any accumulated invalid lines
              if (invalidLines.length > 0) {
                currentChunk += currentChunk;
                invalidLines = [];
              }
            } else {
              // Same type - accumulate
              currentChunk += data;
            }
          } else {
            // Invalid event type
            if (currentType) {
              // Add to current event
              currentChunk += " " + line.trim();
            } else {
              // Store for later
              invalidLines.push(line.trim());
            }
          }
        });
      }

      // Emit final event if exists
      if (currentType) {
        controller.enqueue({
          type: currentType as "event" | "data",
          data: currentChunk,
        });
      }

      controller.close();
    },
  });
};
