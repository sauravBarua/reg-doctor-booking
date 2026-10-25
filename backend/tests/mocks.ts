import type { EmbeddingProvider, LlmProvider } from "../src/ai/types.js";

export class MockLlmProvider implements LlmProvider {
  calls: { system: string; user: string }[] = [];

  constructor(private responses: (string | Error)[]) {}

  async complete(input: { system: string; user: string }) {
    this.calls.push(input);
    const next = this.responses.shift();
    if (next === undefined) throw new Error("MockLlmProvider: no more responses");
    if (next instanceof Error) throw next;
    return next;
  }
}

export class FakeEmbeddingProvider implements EmbeddingProvider {
  calls = 0;

  async embed(texts: string[]) {
    this.calls++;
    return texts.map((t) => {
      const seed = [...t].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      return Array.from({ length: 1024 }, (_, i) => Math.sin(seed + i));
    });
  }
}