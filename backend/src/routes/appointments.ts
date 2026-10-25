import { Router } from "express";
import { getAiDeps } from "../ai/index.js";
import {
  bookBodySchema,
  idParamSchema,
  summaryQuerySchema,
} from "../schemas/index.js";
import {
  bookAppointment,
  cancelAppointment,
} from "../services/appointment.service.js";
import { getAppointmentSummary } from "../services/summary.service.js";

export const appointmentsRouter = Router();

appointmentsRouter.post("/", async (req, res) => {
  const { patientId, slotId } = bookBodySchema.parse(req.body);
  res.status(201).json(await bookAppointment(patientId, slotId));
});

appointmentsRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await cancelAppointment(id));
});

appointmentsRouter.get("/:id/summary", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { type } = summaryQuerySchema.parse(req.query);
  res.json(await getAppointmentSummary(id, type, getAiDeps()));
});
