import { getAiDeps } from "../src/ai/index.js";
import { prisma } from "../src/db/prisma.js";
import { assistantSearch } from "../src/services/assistant.service.js";

const queries = [
  "Any cardiologist",
  "a cardiologist in Paris tomorrow afternoon",
  "heart doctor in Lyon next Monday morning",
];

try {
  const deps = getAiDeps();

  for (const q of queries) {
    console.log(`\n> ${q}`);
    const search = await assistantSearch(q, deps);
    if (search.kind !== "results") {
      console.log("Result kind:", search.kind);
      continue;
    }
    console.log("Filters:", search.filters);
    console.log(
      "Doctors:",
      search.doctors.map((d) => `${d.name} (${d.specialty})`),
    );
    console.log("Notices:", search.notices);
  }
} finally {
  await prisma.$disconnect();
}
