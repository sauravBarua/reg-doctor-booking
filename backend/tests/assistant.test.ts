import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { assistantSearch } from "../src/services/assistant.service.js";
import { MockLlmProvider } from "./mocks.js";

const filters = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    specialty: null,
    city: null,
    date: null,
    timeOfDay: null,
    medicalAdviceRequested: false,
    ...overrides,
  });

afterAll(() => prisma.$disconnect());

describe("assistantSearch", () => {
  it("returns a fixed message for emergencies without calling the LLM", async () => {
    const llm = new MockLlmProvider([]);
    const res = await assistantSearch("I have chest pain, find me a doctor", {
      llm,
    });
    expect(res.kind).toBe("emergency");
    expect(llm.calls).toHaveLength(0);
  });

  it("maps the request to filters and returns real doctors from the database", async () => {
    const llm = new MockLlmProvider([
      filters({ specialty: "dermatologist", city: "lyon" }),
    ]);
    const res = await assistantSearch("a skin doctor in Lyon", { llm });
    expect(res.kind).toBe("results");
    if (res.kind !== "results") return;
    expect(res.filters).toMatchObject({
      specialty: "Dermatologist",
      city: "Lyon",
    });
    expect(res.doctors).toHaveLength(1);
    expect(res.doctors[0]!.name).toBe("Dr. Antoine Moreau");
    expect(res.doctors[0]!.slots.length).toBeGreaterThan(0);
  });

  it("sends today's date to the model", async () => {
    const llm = new MockLlmProvider([filters()]);
    await assistantSearch("any doctor", { llm });
    expect(llm.calls[0]!.user).toContain(new Date().toISOString().slice(0, 10));
  });

  it("drops a specialty that is not in the fixed list", async () => {
    const llm = new MockLlmProvider([
      filters({ specialty: "Astrologer", city: "Lyon" }),
    ]);
    const res = await assistantSearch("an astrologer in Lyon", { llm });
    if (res.kind !== "results") throw new Error("expected results");
    expect(res.filters.specialty).toBeNull();
    expect(res.doctors).toHaveLength(4); // all Lyon doctors
    expect(res.notices.length).toBeGreaterThan(0);
  });

  it("ignores a date in the past", async () => {
    const llm = new MockLlmProvider([filters({ date: "2000-01-01" })]);
    const res = await assistantSearch("a doctor on 1 January 2000", { llm });
    if (res.kind !== "results") throw new Error("expected results");
    expect(res.filters.date).toBeNull();
    expect(res.doctors.length).toBeGreaterThan(0);
    expect(res.notices.join(" ")).toMatch(/past/);
  });

  it("filters slots by time of day using database slots", async () => {
    const slot = await prisma.slot.findFirstOrThrow({
      where: { startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    const date = slot.startsAt.toISOString().slice(0, 10);
    const llm = new MockLlmProvider([
      filters({ date, timeOfDay: "afternoon" }),
    ]);
    const res = await assistantSearch("a doctor in the afternoon", { llm });
    if (res.kind !== "results") throw new Error("expected results");
    expect(res.doctors.length).toBeGreaterThan(0);
    for (const d of res.doctors) {
      expect(d.slots.every((s) => s.startsAt.getUTCHours() >= 12)).toBe(true);
    }
  });

  it("adds a no-medical-advice notice when symptoms are described", async () => {
    const llm = new MockLlmProvider([
      filters({
        specialty: "General Practitioner",
        medicalAdviceRequested: true,
      }),
    ]);
    const res = await assistantSearch("I have a rash, what is it?", { llm });
    if (res.kind !== "results") throw new Error("expected results");
    expect(res.notices.join(" ")).toMatch(/medical advice/);
  });

  it("shows all doctors with a notice when the model output is invalid", async () => {
    const llm = new MockLlmProvider(["not json", "still not json"]);
    const res = await assistantSearch("anything", { llm });
    if (res.kind !== "results") throw new Error("expected results");
    expect(res.doctors).toHaveLength(8);
    expect(res.notices.length).toBeGreaterThan(0);
  });
});

describe("POST /api/assistant/search", () => {
  it("returns 400 for an empty query before any AI call", async () => {
    const res = await request(createApp())
      .post("/api/assistant/search")
      .send({});
    expect(res.status).toBe(400);
  });
});
