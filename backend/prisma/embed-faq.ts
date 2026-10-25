import { getEmbeddingProvider } from "../src/ai/index.js";
import { prisma } from "../src/db/prisma.js";
import { embedPendingChunks } from "../src/services/faq.repository.js";

try {
  const count = await embedPendingChunks(getEmbeddingProvider());
  console.log(`Embedded ${count} FAQ chunks`);
} finally {
  await prisma.$disconnect();
}
