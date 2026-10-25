import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env.js";

describe("loadEnv", () => {
  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it("applies defaults", () => {
    const env = loadEnv({ DATABASE_URL: "postgresql://a:b@localhost:5432/x" });
    expect(env.PORT).toBe(3001);
    expect(env.TOP_K).toBe(4);
  });
});
