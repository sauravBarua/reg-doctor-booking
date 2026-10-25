import { prisma } from "../db/prisma.js";
import type { EmbeddingProvider } from "../ai/types.js";

export type ChunkHit = { id: number; title: string; content: string; score: number };

const toVector = (v: number[]) => `[${v.join(",")}]`;

/** Cosine similarity search. All values are bound parameters. */
export async function searchChunks(embedding: number[], topK: number): Promise<ChunkHit[]> {
  const vec = toVector(embedding);
  return prisma.$queryRaw<ChunkHit[]>`
    SELECT c."id", d."title", c."content",
           1 - (c."embedding" <=> ${vec}::vector) AS score
    FROM "FaqChunk" c
    JOIN "FaqDocument" d ON d."id" = c."documentId"
    WHERE c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${vec}::vector
    LIMIT ${topK}`;
}

/** Embeds every chunk that has no vector yet. Returns how many were embedded. */
export async function embedPendingChunks(embeddings: EmbeddingProvider): Promise<number> {
  const pending = await prisma.$queryRaw<{ id: number; content: string }[]>`
    SELECT "id", "content" FROM "FaqChunk" WHERE "embedding" IS NULL ORDER BY "id"`;

  const BATCH = 64;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embeddings.embed(
      batch.map((c) => c.content),
      "document",
    );
    for (const [j, chunk] of batch.entries()) {
      const vec = toVector(vectors[j]!);
      await prisma.$executeRaw`UPDATE "FaqChunk" SET "embedding" = ${vec}::vector WHERE "id" = ${chunk.id}`;
    }
  }
  return pending.length;
}