import { loadEnv } from "../config/env.js";
import { AppError } from "../errors.js";
import { ClaudeProvider } from "./claude.provider.js";
import { GeminiEmbeddingProvider, GeminiLlmProvider } from "./gemini.provider.js";
import type { AiDeps, EmbeddingProvider, LlmProvider } from "./types.js";
import { VoyageProvider } from "./voyage.provider.js";

function requireKey(value: string | undefined, name: string): string {
  if (!value) throw new AppError(503, `AI is not configured: set ${name}`);
  return value;
}

export function getLlmProvider(): LlmProvider {
  const env = loadEnv();
  return env.LLM_PROVIDER === "gemini"
    ? new GeminiLlmProvider(requireKey(env.GEMINI_API_KEY, "GEMINI_API_KEY"), env.LLM_MODEL)
    : new ClaudeProvider(requireKey(env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"), env.LLM_MODEL);
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const env = loadEnv();
  return env.EMBEDDING_PROVIDER === "gemini"
    ? new GeminiEmbeddingProvider(
        requireKey(env.GEMINI_API_KEY, "GEMINI_API_KEY"),
        env.EMBEDDING_MODEL,
        env.EMBEDDING_DIMENSIONS,
      )
    : new VoyageProvider(requireKey(env.VOYAGE_API_KEY, "VOYAGE_API_KEY"), env.EMBEDDING_MODEL, env.EMBEDDING_DIMENSIONS);
}

let cached: AiDeps | undefined;

export function getAiDeps(): AiDeps {
  if (cached) return cached;
  const env = loadEnv();
  cached = {
    llm: getLlmProvider(),
    embeddings: getEmbeddingProvider(),
    topK: env.TOP_K,
    threshold: env.SIMILARITY_THRESHOLD,
  };
  return cached;
}