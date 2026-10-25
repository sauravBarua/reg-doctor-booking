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

export type DoctorsQuery = z.infer<typeof doctorsQuerySchema>;
