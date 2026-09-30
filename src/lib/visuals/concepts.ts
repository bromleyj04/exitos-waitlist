export const reasonVisualConcepts = [
  "capture-intent",
  "audience",
  "qualify",
  "growth",
  "referral",
  "alert",
  "automation",
  "analytics",
  "message",
  "security",
  "time",
  "launch",
] as const;

export type ReasonVisualConcept = (typeof reasonVisualConcepts)[number];
