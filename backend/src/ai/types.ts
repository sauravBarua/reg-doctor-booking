export interface LlmProvider {
  complete(input: {
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<string>;
}

export interface EmbeddingProvider {
  embed(texts: string[], inputType: "document" | "query"): Promise<number[][]>;
}

export type AiDeps = {
  llm: LlmProvider;
  embeddings: EmbeddingProvider;
  topK: number;
  threshold: number;
};
