import { Router } from "express";
import { getAiDeps } from "../ai/index.js";
import { faqBodySchema, searchBodySchema } from "../schemas/index.js";
import { assistantSearch } from "../services/assistant.service.js";
import { answerFaq } from "../services/faq.service.js";

export const assistantRouter = Router();

assistantRouter.post("/search", async (req, res) => {
  const { query } = searchBodySchema.parse(req.body);
  res.json(await assistantSearch(query, getAiDeps()));
});

assistantRouter.post("/faq", async (req, res) => {
  const { question } = faqBodySchema.parse(req.body);
  res.json(await answerFaq(question, getAiDeps()));
});
