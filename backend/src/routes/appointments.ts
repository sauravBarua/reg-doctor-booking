import { Router } from "express";
import { bookBodySchema, idParamSchema } from "../schemas/index.js";
import {
  bookAppointment,
  cancelAppointment,
} from "../services/appointment.service.js";

export const appointmentsRouter = Router();

appointmentsRouter.post("/", async (req, res) => {
  const { patientId, slotId } = bookBodySchema.parse(req.body);
  res.status(201).json(await bookAppointment(patientId, slotId));
});

appointmentsRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await cancelAppointment(id));
});
