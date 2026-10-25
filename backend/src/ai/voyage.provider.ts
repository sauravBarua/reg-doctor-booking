import type { EmbeddingProvider } from "./types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type VoyageResponse = {
  data: { index: number; embedding: number[] }[];
  usage?: { total_tokens: number };
};

export class VoyageProvider implements EmbeddingProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private dimensions: number,
  ) {}

  // Voyage accepts up to 128 inputs per request; callers batch accordingly
  async embed(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
    if (texts.length === 0) return [];

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const started = Date.now();
        const res = await fetch("https://api.voyageai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({
            input: texts,
            model: this.model,
            input_type: inputType,
            output_dimension: this.dimensions,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (res.ok) {
          const json = (await res.json()) as VoyageResponse;
          console.log(`[embed] ${Date.now() - started}ms tokens=${json.usage?.total_tokens ?? "?"}`);
          const vectors = json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
          if (vectors.some((v) => v.length !== this.dimensions)) {
            throw new Error(`Embedding size mismatch (expected ${this.dimensions})`);
          }
          return vectors;
        }

        lastError = new Error(`Voyage API error ${res.status}`);
        if (res.status !== 429 && res.status < 500) break; // not worth retrying
      } catch (err) {
        lastError = err;
      }
      await sleep(500);
    }
    throw lastError;
  }
}