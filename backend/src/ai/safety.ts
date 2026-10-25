export const EMERGENCY_MESSAGE =
  "This sounds like it could be an emergency. Please call 112 (or 15, SAMU, in France) right now. " +
  "If you are thinking about harming yourself, call 3114, the national suicide prevention line in France. " +
  "I can't give medical advice or help book an appointment in an emergency.";

// Patterns are matched on lowercase text with accents removed
const EMERGENCY_PATTERNS: RegExp[] = [
  /chest pain/,
  /can[’']?t breathe|cannot breathe|trouble breathing|difficulty breathing|short(ness)? of breath/,
  /heart attack/,
  /\bstroke\b/,
  /unconscious|passed out|not responding/,
  /severe bleeding|bleeding (heavily|a lot)/,
  /seizure/,
  /overdose/,
  /anaphyla/,
  /suicid|kill myself|end my life|want to die/,
  /douleur (dans la |a la )?poitrine/,
  /ne peux pas respirer|difficulte a respirer/,
  /crise cardiaque/,
  /\bavc\b/,
  /me tuer/,
];

export function isEmergency(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return EMERGENCY_PATTERNS.some((p) => p.test(normalized));
}

/** Stops user text from closing the XML-style tags used in prompts. */
export function sanitizeForPrompt(text: string): string {
  return text.replace(/[<>]/g, " ").trim();
}
