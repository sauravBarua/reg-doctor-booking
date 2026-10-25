import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

const app = createApp();
const createdIds: number[] = [];

let patientId: number;
let doctorId: number;
let slotA: number; // used for the book/cancel flow
let slotB: number; // used for the concurrency test

async function freeSlotIds(): Promise<number[]> {
  const res = await request(app).get(`/api/doctors/${doctorId}/slots`);
  return res.body.map((s: { id: number }) => s.id);
}

async function book(slotId: number) {
  const res = await request(app)
    .post("/api/appointments")
    .send({ patientId, slotId });
  if (res.status === 201) createdIds.push(res.body.id);
  return res;
}

beforeAll(async () => {
  const patient = await prisma.patient.findFirstOrThrow();
  const doctor = await prisma.doctor.findFirstOrThrow();
  patientId = patient.id;
  doctorId = doctor.id;
  const ids = await freeSlotIds();
  slotA = ids[0]!;
  slotB = ids[1]!;
});

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

describe("booking and cancelling", () => {
  it("books a free slot and removes it from availability", async () => {
    const res = await book(slotA);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("BOOKED");
    expect(res.body.slot.id).toBe(slotA);

    expect(await freeSlotIds()).not.toContain(slotA);
  });

  it("rejects booking the same slot twice with 409", async () => {
    const res = await book(slotA);
    expect(res.status).toBe(409);
  });

  it("cancels an appointment and frees the slot", async () => {
    const id = createdIds[0]!;
    const res = await request(app).delete(`/api/appointments/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(res.body.cancelledAt).not.toBeNull();

    expect(await freeSlotIds()).toContain(slotA);
  });

  it("rejects cancelling twice with 409", async () => {
    const res = await request(app).delete(`/api/appointments/${createdIds[0]}`);
    expect(res.status).toBe(409);
  });

  it("allows rebooking a slot after cancellation", async () => {
    const res = await book(slotA);
    expect(res.status).toBe(201);
  });

  it("lets only one of two simultaneous bookings succeed", async () => {
    const results = await Promise.all([book(slotB), book(slotB)]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
  });
});

describe("validation and not found", () => {
  it("returns 400 for an invalid body", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .send({ patientId: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 404 for an unknown patient", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .send({ patientId: 999999, slotId: slotA });
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown slot", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .send({ patientId, slotId: 999999 });
    expect(res.status).toBe(404);
  });

  it("returns 404 when cancelling an unknown appointment", async () => {
    const res = await request(app).delete("/api/appointments/999999");
    expect(res.status).toBe(404);
  });
});
