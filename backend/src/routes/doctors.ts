import { Router } from "express";
import {
  doctorsQuerySchema,
  idParamSchema,
  slotsQuerySchema,
} from "../schemas/index.js";
import { getDoctorSlots, searchDoctors } from "../services/doctor.service.js";

export const doctorsRouter = Router();

doctorsRouter.get("/", async (req, res) => {
  const query = doctorsQuerySchema.parse(req.query);
  res.json(await searchDoctors(query));
});

doctorsRouter.get("/:id/slots", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { date } = slotsQuerySchema.parse(req.query);
  res.json(await getDoctorSlots(id, date));
});
