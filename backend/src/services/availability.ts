import type { Prisma } from "../generated/prisma/client.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A "YYYY-MM-DD" string is treated as a UTC day. */
export function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Slots that are in the future (and inside the given day, if any) with no BOOKED appointment. */
export function availableSlotWhere(date?: string): Prisma.SlotWhereInput {
  const now = new Date();
  const appointments = { none: { status: "BOOKED" as const } };

  if (!date) {
    return { startsAt: { gt: now }, appointments };
  }
  const { start, end } = dayRange(date);
  return {
    startsAt: { gte: new Date(Math.max(start.getTime(), now.getTime())), lt: end },
    appointments,
  };
}