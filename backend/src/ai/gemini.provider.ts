import type { EmbeddingProvider, LlmProvider } from "./types.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geminiPost<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return (await res.json()) as T;
      lastError = new Error(`Gemini API error ${res.status}`);
      if (res.status !== 429 && res.status < 500) break; // not worth retrying
    } catch (err) {
      lastError = err;
    }
    await sleep(2000 * 2 ** attempt); // 2s, then 4s
  }
  throw lastError;
}

type GenerateResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export class GeminiLlmProvider implements LlmProvider {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async complete({ system, user, maxTokens = 800 }: { system: string; user: string; maxTokens?: number }) {
    const started = Date.now();
    const json = await geminiPost<GenerateResponse>(this.apiKey, `${this.model}:generateContent`, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        // Thinking models spend part of this budget on reasoning, so leave headroom
        maxOutputTokens: maxTokens * 4,
        responseMimeType: "application/json",
      },
    });
    console.log(
      `[llm] ${Date.now() - started}ms input=${json.usageMetadata?.promptTokenCount ?? "?"} output=${json.usageMetadata?.candidatesTokenCount ?? "?"}`,
    );
    return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }
}

type BatchEmbedResponse = { embeddings?: { values: number[] }[] };

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private dimensions: number,
  ) {}

  async embed(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
    if (texts.length === 0) return [];
    const started = Date.now();
    const json = await geminiPost<BatchEmbedResponse>(this.apiKey, `${this.model}:batchEmbedContents`, {
      requests: texts.map((text) => ({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
        taskType: inputType === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
        outputDimensionality: this.dimensions,
      })),
    });
    console.log(`[embed] ${Date.now() - started}ms texts=${texts.length}`);

    const vectors = (json.embeddings ?? []).map((e) => e.values);
    if (vectors.length !== texts.length || vectors.some((v) => v.length !== this.dimensions)) {
      throw new Error(`Embedding mismatch (expected ${texts.length} x ${this.dimensions})`);
    }
    return vectors;
  }
}