import { Router } from "express";
import { prisma } from "../db/prisma.js";

export const patientsRouter = Router();

// Demo only: lets the frontend pick a patient. Email is never returned.
patientsRouter.get("/", async (_req, res) => {
  res.json(
    await prisma.patient.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    }),
  );
});
