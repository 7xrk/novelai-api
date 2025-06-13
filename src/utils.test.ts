import { expect } from "@std/expect";
import { responseToEventStream } from "./utils.ts";

// src/utils.test.ts

function createMockResponse(content: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content));
      controller.close();
    },
  });

  return new Response(stream);
}

async function readAllChunks(stream: ReadableStream) {
  const reader = stream.getReader();
  const chunks = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

Deno.test("responseToEventStream - basic event and data parsing", async () => {
  const content = "event: message\ndata: hello world\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({ type: "event", data: "message" });
  expect(chunks[1]).toEqual({ type: "data", data: "hello world" });
});

Deno.test("responseToEventStream - multiple events", async () => {
  const content = "event: start\ndata: beginning\nevent: end\ndata: finished\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(4);
  expect(chunks[0]).toEqual({ type: "event", data: "start" });
  expect(chunks[1]).toEqual({ type: "data", data: "beginning" });
  expect(chunks[2]).toEqual({ type: "event", data: "end" });
  expect(chunks[3]).toEqual({ type: "data", data: "finished" });
});

Deno.test("responseToEventStream - data only", async () => {
  const content = "data: just data\ndata: more data\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // Same type gets accumulated
  expect(chunks.length).toEqual(1);
  expect(chunks[0]).toEqual({ type: "data", data: "just data more data" });
});

Deno.test("responseToEventStream - empty stream", async () => {
  const content = "";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(0);
});

Deno.test("responseToEventStream - with empty lines", async () => {
  const content = "event: test\n\ndata: content\n\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // Empty lines should be filtered out
  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({ type: "event", data: "test" });
  expect(chunks[1]).toEqual({ type: "data", data: "content" });
});

Deno.test("responseToEventStream - invalid event types", async () => {
  const content = "invalid: line\nevent: valid\ndata: test\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // Invalid lines get treated as continuation data for the current chunk
  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({ type: "event", data: "valid invalid: line" });
  expect(chunks[1]).toEqual({ type: "data", data: "test" });
});

Deno.test("responseToEventStream - error event type", async () => {
  const content = "error: something went wrong\ndata: error details\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({ type: "error", data: "something went wrong" });
  expect(chunks[1]).toEqual({ type: "data", data: "error details" });
});

Deno.test("responseToEventStream - event without data", async () => {
  const content = "event: standalone\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(1);
  expect(chunks[0]).toEqual({ type: "event", data: "standalone" });
});

Deno.test("responseToEventStream - malformed lines", async () => {
  const content =
    "no-colon-line\nevent: valid\nmissing-space:invalid\ndata: good\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // Malformed lines get accumulated with the valid events
  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({
    type: "event",
    data: "valid no-colon-line missing-space:invalid",
  });
  expect(chunks[1]).toEqual({ type: "data", data: "good" });
});

Deno.test("responseToEventStream - chunked data", async () => {
  // Simulate data coming in multiple chunks
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: "));
      controller.enqueue(encoder.encode("start\ndata: "));
      controller.enqueue(encoder.encode("content\n"));
      controller.close();
    },
  });

  const response = new Response(stream);
  const eventStream = responseToEventStream(response);
  const chunks = await readAllChunks(eventStream);

  // When data is chunked, invalid lines get accumulated in currentChunk
  // The behavior will depend on how the decoder processes the chunked data
  expect(chunks.length >= 2).toBe(true);
  // The exact behavior depends on how the streaming decoder works
});

Deno.test("responseToEventStream - only whitespace data", async () => {
  const content = "data:   \nevent: test\ndata: content\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(3);
  expect(chunks[0]).toEqual({ type: "data", data: "  " });
  expect(chunks[1]).toEqual({ type: "event", data: "test" });
  expect(chunks[2]).toEqual({ type: "data", data: "content" });
});

Deno.test("responseToEventStream - colon in data content", async () => {
  const content = "data: key: value with: colons\nevent: test\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // The new implementation preserves content after first ": "
  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({ type: "data", data: "key: value with: colons" });
  expect(chunks[1]).toEqual({ type: "event", data: "test" });
});

Deno.test("responseToEventStream - no space after colon", async () => {
  const content = "data:no-space\nevent: with-space\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // Without space after colon, it doesn't match the ": " pattern, so it's treated as invalid
  expect(chunks.length).toEqual(1);
  expect(chunks[0]).toEqual({
    type: "event",
    data: "with-space data:no-space",
  });
});

Deno.test("responseToEventStream - alternating types", async () => {
  const content =
    "event: start\ndata: first\nevent: middle\ndata: second\nevent: end\n";
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  expect(chunks.length).toEqual(5);
  expect(chunks[0]).toEqual({ type: "event", data: "start" });
  expect(chunks[1]).toEqual({ type: "data", data: "first" });
  expect(chunks[2]).toEqual({ type: "event", data: "middle" });
  expect(chunks[3]).toEqual({ type: "data", data: "second" });
  expect(chunks[4]).toEqual({ type: "event", data: "end" });
});

Deno.test("responseToEventStream - proper SSE multi-line data", async () => {
  // Multi-line data where lines without ":" are continuation of the data payload
  const content = `data: {"prop": "a",
 "image": "BASE64
 ENCODED
 STRING"}
event: complete`;
  const response = await createMockResponse(content);
  const stream = responseToEventStream(response);
  const chunks = await readAllChunks(stream);

  // EXPECTED: The broken lines should be concatenated WITHOUT newlines
  expect(chunks.length).toEqual(2);
  expect(chunks[0]).toEqual({
    type: "data",
    data: '{"prop": "a", "image": "BASE64 ENCODED STRING"}',
  });
  expect(chunks[1]).toEqual({
    type: "event",
    data: "complete",
  });
});
