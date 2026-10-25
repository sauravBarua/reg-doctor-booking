import { beforeEach, describe, expect, it, vi } from "vitest";
import { answerFaq } from "../src/services/faq.service.js";
import { searchChunks } from "../src/services/faq.repository.js";
import { FakeEmbeddingProvider, MockLlmProvider } from "./mocks.js";

vi.mock("../src/services/faq.repository.js", () => ({ searchChunks: vi.fn() }));

const hit = {
  id: 1,
  title: "Cancellation policy",
  content:
    "Appointments can be cancelled free of charge up to 24 hours before.",
  score: 0.82,
};

function deps(llm: MockLlmProvider, embeddings = new FakeEmbeddingProvider()) {
  return { llm, embeddings, topK: 4, threshold: 0.5 };
}

beforeEach(() => {
  vi.mocked(searchChunks).mockReset();
});

describe("answerFaq", () => {
  it("answers emergencies with a fixed message and no AI calls", async () => {
    const llm = new MockLlmProvider([]);
    const embeddings = new FakeEmbeddingProvider();
    const res = await answerFaq("I can't breathe", deps(llm, embeddings));
    expect(res.kind).toBe("emergency");
    expect(llm.calls).toHaveLength(0);
    expect(embeddings.calls).toBe(0);
  });

  it("says it doesn't know when no chunk passes the threshold, without calling the LLM", async () => {
    vi.mocked(searchChunks).mockResolvedValue([{ ...hit, score: 0.2 }]);
    const llm = new MockLlmProvider([]);
    const res = await answerFaq("Do you sell pizza?", deps(llm));
    expect(res.kind).toBe("not_found");
    expect(llm.calls).toHaveLength(0);
  });

  it("returns an answer with sources taken from the cited passages", async () => {
    vi.mocked(searchChunks).mockResolvedValue([hit]);
    const llm = new MockLlmProvider([
      '{"answerable": true, "answer": "Free up to 24 hours before [1].", "citations": [1]}',
    ]);
    const res = await answerFaq("Can I cancel?", deps(llm));
    expect(res.kind).toBe("answer");
    expect(res.sources[0]).toMatchObject({
      chunkId: 1,
      documentTitle: "Cancellation policy",
    });
    expect(llm.calls[0]!.user).toContain("<context>");
  });

  it("rejects an answer whose citations don't match any passage", async () => {
    vi.mocked(searchChunks).mockResolvedValue([hit]);
    const llm = new MockLlmProvider([
      '{"answerable": true, "answer": "Maybe.", "citations": [7]}',
    ]);
    const res = await answerFaq("Can I cancel?", deps(llm));
    expect(res.kind).toBe("not_found");
  });

  it("returns not_found when the model says it is not answerable", async () => {
    vi.mocked(searchChunks).mockResolvedValue([hit]);
    const llm = new MockLlmProvider([
      '{"answerable": false, "answer": "", "citations": []}',
    ]);
    const res = await answerFaq(
      "What should I take for a headache?",
      deps(llm),
    );
    expect(res.kind).toBe("not_found");
  });

  it("returns a safe error when the model output is invalid twice", async () => {
    vi.mocked(searchChunks).mockResolvedValue([hit]);
    const llm = new MockLlmProvider(["nope", "nope"]);
    const res = await answerFaq("Can I cancel?", deps(llm));
    expect(res.kind).toBe("error");
  });

  it("returns a safe error when embedding fails", async () => {
    const failing = {
      embed: async () => {
        throw new Error("down");
      },
    };
    const res = await answerFaq("Can I cancel?", {
      llm: new MockLlmProvider([]),
      embeddings: failing,
      topK: 4,
      threshold: 0.5,
    });
    expect(res.kind).toBe("error");
  });
});
