-- Only one BOOKED appointment per slot (cancelled ones don't block rebooking)
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_slotId_booked_key"
  ON "Appointment"("slotId")
  WHERE "status" = 'BOOKED';

-- Cosine similarity index for FAQ embeddings
CREATE INDEX IF NOT EXISTS "FaqChunk_embedding_hnsw"
  ON "FaqChunk" USING hnsw ("embedding" vector_cosine_ops);
