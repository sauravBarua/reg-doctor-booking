import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3001),
  DATABASE_URL: z.url(),

  // AI settings: optional now, required in Phase 4
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("claude-sonnet-5-5"),
  VOYAGE_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default("voyage-3.5"),
  EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .positive()
    .default(1024),
  TOP_K: z.coerce
    .number()
    .int()
    .positive()
    .default(4),
  SIMILARITY_THRESHOLD: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(0.5),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
