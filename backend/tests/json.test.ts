import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidated } from "../src/ai/json.js";
import { MockLlmProvider } from "./mocks.js";

const schema = z.object({ ok: z.boolean() });
const input = { system: "s", user: "u" };
const fallback = { ok: false };

describe("generateValidated", () => {
  it("parses valid JSON, even inside code fences", async () => {
    const llm = new MockLlmProvider(['```json\n{"ok": true}\n```']);
    const res = await generateValidated(llm, schema, input, fallback);
    expect(res).toEqual({ data: { ok: true }, fallbackUsed: false });
  });

  it("retries once after invalid output", async () => {
    const llm = new MockLlmProvider(["not json", '{"ok": true}']);
    const res = await generateValidated(llm, schema, input, fallback);
    expect(res.fallbackUsed).toBe(false);
    expect(llm.calls).toHaveLength(2);
  });

  it("falls back after two invalid outputs", async () => {
    const llm = new MockLlmProvider(['{"ok": "yes"}', "nope"]);
    const res = await generateValidated(llm, schema, input, fallback);
    expect(res).toEqual({ data: fallback, fallbackUsed: true });
  });

  it("falls back when the provider throws", async () => {
    const llm = new MockLlmProvider([new Error("boom"), new Error("boom")]);
    const res = await generateValidated(llm, schema, input, fallback);
    expect(res.fallbackUsed).toBe(true);
  });
});
