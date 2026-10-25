import { getAiDeps } from "../src/ai/index.js";
import { prisma } from "../src/db/prisma.js";
import { assistantSearch } from "../src/services/assistant.service.js";
import { answerFaq } from "../src/services/faq.service.js";

try {
  const deps = getAiDeps();

  const search = await assistantSearch(
    "a skin doctor in Lyon next Tuesday morning",
    deps,
  );
  if (search.kind === "results") {
    console.log("Search filters:", search.filters);
    console.log(
      "Doctors found:",
      search.doctors.map((d) => d.name),
    );
    console.log("Notices:", search.notices);
  }

  const faq = await answerFaq(
    "Can I cancel my appointment the day before?",
    deps,
  );
  console.log("FAQ:", faq.kind, "|", faq.answer);
  console.log(
    "Sources:",
    faq.sources.map((s) => `${s.documentTitle} (${s.score})`),
  );
} finally {
  await prisma.$disconnect();
}
