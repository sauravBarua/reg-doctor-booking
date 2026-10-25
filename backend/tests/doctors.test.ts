import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("GET /api/doctors", () => {
  it("returns all seeded doctors with next slots", async () => {
    const res = await request(app).get("/api/doctors");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    expect(res.body[0].nextSlots.length).toBeGreaterThan(0);
  });

  it("filters by specialty and city (case-insensitive)", async () => {
    const res = await request(app).get(
      "/api/doctors?specialty=dermatologist&city=lyon",
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Dr. Antoine Moreau");
    expect(res.body[0].clinic.city).toBe("Lyon");
  });

  it("returns an empty list for a date with no slots", async () => {
    const res = await request(app).get("/api/doctors?date=2000-01-01");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns doctors with slots on a date that has availability", async () => {
    const first = await request(app).get("/api/doctors");
    const date = String(first.body[0].nextSlots[0].startsAt).slice(0, 10);
    const res = await request(app).get(`/api/doctors?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("rejects an invalid date with 400", async () => {
    const res = await request(app).get("/api/doctors?date=tomorrow");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});

describe("GET /api/doctors/:id/slots", () => {
  it("returns only free slots for the requested date", async () => {
    const doctors = await request(app).get("/api/doctors");
    const doctor = doctors.body[0];
    const date = String(doctor.nextSlots[0].startsAt).slice(0, 10);

    const res = await request(app).get(
      `/api/doctors/${doctor.id}/slots?date=${date}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const slot of res.body) {
      expect(String(slot.startsAt).slice(0, 10)).toBe(date);
    }
  });

  it("returns 404 for an unknown doctor", async () => {
    const res = await request(app).get("/api/doctors/999999/slots");
    expect(res.status).toBe(404);
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(app).get("/api/doctors/abc/slots");
    expect(res.status).toBe(400);
  });
});
