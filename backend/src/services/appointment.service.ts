import { prisma } from "../db/prisma.js";
import { AppError } from "../errors.js";

const appointmentInclude = {
  patient: true,
  slot: { include: { doctor: { include: { specialty: true, clinic: true } } } },
} as const;

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === "P2002" ||
    /duplicate key|unique constraint/i.test(e?.message ?? "")
  );
}

export async function bookAppointment(patientId: number, slotId: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new AppError(404, "Patient not found");

      const slot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!slot) throw new AppError(404, "Slot not found");
      if (slot.startsAt <= new Date())
        throw new AppError(409, "Slot is in the past");

      const taken = await tx.appointment.findFirst({
        where: { slotId, status: "BOOKED" },
      });
      if (taken) throw new AppError(409, "Slot is already booked");

      return tx.appointment.create({
        data: { patientId, slotId },
        include: appointmentInclude,
      });
    });
  } catch (err) {
    // Two simultaneous requests: the database index lets only one through
    if (isUniqueViolation(err))
      throw new AppError(409, "Slot is already booked");
    throw err;
  }
}

export async function cancelAppointment(id: number) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  if (!appointment) throw new AppError(404, "Appointment not found");
  if (appointment.status === "CANCELLED")
    throw new AppError(409, "Appointment is already cancelled");
  if (appointment.slot.startsAt <= new Date()) {
    throw new AppError(409, "Past appointments cannot be cancelled");
  }

  return prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: appointmentInclude,
  });
}
