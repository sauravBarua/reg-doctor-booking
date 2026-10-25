import { prisma } from "../db/prisma.js";
import { AppError } from "../errors.js";
import type { DoctorsQuery } from "../schemas/index.js";
import { availableSlotWhere } from "./availability.js";

export async function searchDoctors(query: DoctorsQuery) {
  const slotWhere = availableSlotWhere(query.date);

  const doctors = await prisma.doctor.findMany({
    where: {
      ...(query.specialty
        ? { specialty: { name: { equals: query.specialty, mode: "insensitive" as const } } }
        : {}),
      ...(query.city
        ? { clinic: { city: { equals: query.city, mode: "insensitive" as const } } }
        : {}),
      // With a date, only doctors that still have a free slot that day
      ...(query.date ? { slots: { some: slotWhere } } : {}),
    },
    include: {
      specialty: true,
      clinic: true,
      slots: { where: slotWhere, orderBy: { startsAt: "asc" }, take: 3 },
    },
    orderBy: { name: "asc" },
  });

  return doctors.map((d) => ({
    id: d.id,
    name: d.name,
    bio: d.bio,
    specialty: d.specialty.name,
    clinic: {
      id: d.clinic.id,
      name: d.clinic.name,
      city: d.clinic.city,
      address: d.clinic.address,
    },
    nextSlots: d.slots.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt })),
  }));
}

export async function getDoctorSlots(doctorId: number, date?: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new AppError(404, "Doctor not found");

  const slots = await prisma.slot.findMany({
    where: { doctorId, ...availableSlotWhere(date) },
    orderBy: { startsAt: "asc" },
  });

  return slots.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt }));
}