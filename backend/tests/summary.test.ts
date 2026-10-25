import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { getAppointmentSummary } from "../src/services/summary.service.js";
import { MockLlmProvider } from "./mocks.js";

let appointmentId: number;
let patientEmail: string;

const goodOutput = JSON.stringify({
  summary: "Appointment summary.",
  message: {
    subject: "Your appointment",
    body: "Hello, see you soon. The clinic team",
  },
});

beforeAll(async () => {
  const patient = await prisma.patient.findFirstOrThrow();
  const slot = await prisma.slot.findFirstOrThrow({
    where: {
      startsAt: { gt: new Date() },
      appointments: { none: { status: "BOOKED" } },
    },
    orderBy: { startsAt: "desc" },
  });
  patientEmail = patient.email;
  const appointment = await prisma.appointment.create({
    data: { patientId: patient.id, slotId: slot.id },
  });
  appointmentId = appointment.id;
});

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { id: appointmentId } });
  await prisma.$disconnect();
});

describe("getAppointmentSummary", () => {
  it("uses the LLM output and never sends the patient's email", async () => {
    const llm = new MockLlmProvider([goodOutput]);
    const res = await getAppointmentSummary(appointmentId, undefined, { llm });
    expect(res.generatedBy).toBe("ai");
    expect(res.summary).toBe("Appointment summary.");
    expect(llm.calls[0]!.user).toContain(res.details.doctor);
    expect(llm.calls[0]!.user).not.toContain(patientEmail);
  });

  it("passes the requested message type", async () => {
    const llm = new MockLlmProvider([goodOutput]);
    await getAppointmentSummary(appointmentId, "reminder", { llm });
    expect(llm.calls[0]!.user).toContain('"messageType":"reminder"');
  });

  it("falls back to a deterministic template when the LLM output is invalid", async () => {
    const llm = new MockLlmProvider(["nope", "nope"]);
    const res = await getAppointmentSummary(appointmentId, undefined, { llm });
    expect(res.generatedBy).toBe("template");
    expect(res.summary).toContain(res.details.doctor);
    expect(res.message.body).toContain("confirmed");
  });

  it("throws 404 for an unknown appointment", async () => {
    const llm = new MockLlmProvider([]);
    await expect(
      getAppointmentSummary(999999, undefined, { llm }),
    ).rejects.toThrow("Appointment not found");
  });
});
