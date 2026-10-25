import type { z } from "zod";
import type { LlmProvider } from "./types.js";

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in LLM output");
  return raw.slice(start, end + 1);
}

/**
 * Calls the LLM, validates the JSON output with Zod, retries once,
 * then returns the fallback. Never throws, never logs prompts or outputs.
 */
export async function generateValidated<T>(
  llm: LlmProvider,
  schema: z.ZodType<T>,
  input: { system: string; user: string; maxTokens?: number },
  fallback: T,
): Promise<{ data: T; fallbackUsed: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await llm.complete(input);
      const parsed = schema.safeParse(JSON.parse(extractJson(raw)));
      if (parsed.success) return { data: parsed.data, fallbackUsed: false };
      console.error(`[llm] attempt ${attempt + 1}: output failed validation`);
    } catch (err) {
      console.error(`[llm] attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return { data: fallback, fallbackUsed: true };
}