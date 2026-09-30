import { z } from "zod";

const logoSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1) }),
  z.object({ type: z.literal("image"), src: z.string().min(1), alt: z.string().min(1) }),
]);

const surveyOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const baseQuestionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
});

const surveyQuestionSchema = z.discriminatedUnion("type", [
  baseQuestionSchema.extend({
    type: z.literal("single_select"),
    options: z.array(surveyOptionSchema).min(2),
  }),
  baseQuestionSchema.extend({
    type: z.literal("multi_select"),
    options: z.array(surveyOptionSchema).min(2),
    maxSelections: z.number().int().positive().optional(),
  }),
  baseQuestionSchema.extend({
    type: z.literal("short_text"),
    placeholder: z.string().optional(),
  }),
  baseQuestionSchema.extend({
    type: z.literal("long_text"),
    placeholder: z.string().optional(),
  }),
  baseQuestionSchema.extend({
    type: z.literal("scale"),
    min: z.number().int(),
    max: z.number().int(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional(),
  }),
]);

export const themePresetSchema = z.enum(["minimal-light", "minimal-dark", "warm-gradient"]);

export const waitlistProjectSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1),
  logo: logoSchema,
  theme: z.object({
    defaultMode: z.enum(["light", "dark", "system"]).default("dark"),
    preset: themePresetSchema.default("minimal-dark"),
    accent: z.string().min(1).default("emerald"),
  }),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    image: z.string().optional(),
  }),
  hero: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1),
    ctaLabel: z.string().min(1),
  }),
  capture: z.object({
    collectFirstName: z.boolean().default(false),
    firstNameLabel: z.string().default("First name"),
    emailLabel: z.string().default("Email address"),
  }),
  offer: z.object({
    text: z.string().min(1),
  }),
  founderVideo: z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    embedUrl: z.string().optional(),
    poster: z.string().optional(),
  }),
  reasons: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  ).length(3),
  faq: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
    }),
  ).min(2).max(4),
  survey: z.object({
    introTitle: z.string().min(1),
    introDescription: z.string().min(1),
    questions: z.array(surveyQuestionSchema).min(1),
  }),
  referral: z.object({
    enabled: z.boolean().default(true),
    rewardCopy: z.string().min(1),
    thresholdCopy: z.string().optional(),
  }),
  footer: z.object({
    text: z.string().min(1),
    links: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) })).default([]),
  }),
});

export type WaitlistProjectConfig = z.infer<typeof waitlistProjectSchema>;
export type SurveyQuestion = WaitlistProjectConfig["survey"]["questions"][number];
export type ThemePreset = z.infer<typeof themePresetSchema>;

export function defineWaitlistProject(config: z.input<typeof waitlistProjectSchema>) {
  return waitlistProjectSchema.parse(config);
}
