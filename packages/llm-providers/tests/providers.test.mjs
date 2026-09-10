import assert from "node:assert/strict";
import test from "node:test";
import { createProvider } from "../dist/index.js";

test("Gemini sends the key in a header, never in a URL", async () => {
  let seen;
  const provider = createProvider({ id: "gemini", apiKey: "secret-value" }, async (input, init) => { seen = { input, init }; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200, headers: { "content-type": "application/json" } }); });
  await provider.chat({ model: "gemini-test", messages: [{ role: "user", content: "hello" }] });
  assert.equal(seen.input.includes("secret-value"), false);
  assert.equal(seen.init.headers["x-goog-api-key"], "secret-value");
});

test("OpenAI-compatible providers retain their adapter boundary", async () => {
  const calls = [];
  const provider = createProvider({ id: "openai", apiKey: "secret-value" }, async (input, init) => { calls.push({ input, init }); return new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 }); });
  const response = await provider.chat({ model: "selected-model", messages: [{ role: "user", content: "hello" }] });
  assert.equal(response.content, "hello");
  assert.match(calls[0].input, /chat\/completions$/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer secret-value");
});
