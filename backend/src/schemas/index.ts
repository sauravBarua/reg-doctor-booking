import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional();

export const doctorsQuerySchema = z.object({
  specialty: optionalText,
  city: optionalText,
  date: z.iso.date().optional(),
});

export const slotsQuerySchema = z.object({
  date: z.iso.date().optional(),
});

export const idParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive(),
});

export const bookBodySchema = z.object({
  patientId: z
    .number()
    .int()
    .positive(),
  slotId: z
    .number()
    .int()
    .positive(),
});

export const searchBodySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(500),
});

export const faqBodySchema = z.object({
  question: z
    .string()
    .trim()
    .min(2)
    .max(500),
});

export const messageTypes = [
  "confirmation",
  "reminder",
  "reschedule",
  "cancellation",
] as const;
export type MessageType = typeof messageTypes[number];

export const summaryQuerySchema = z.object({
  type: z.enum(messageTypes).optional(),
});

export type DoctorsQuery = z.infer<typeof doctorsQuerySchema>;
