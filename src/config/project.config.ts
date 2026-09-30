import { defineWaitlistProject } from "./schema";

export const projectConfig = defineWaitlistProject({
  id: "validation-demo",
  name: "SignalKit",
  logo: { type: "text", text: "SignalKit" },
  theme: { defaultMode: "dark", preset: "minimal-dark", accent: "emerald" },
  seo: {
    title: "SignalKit validation waitlist",
    description: "Join the validation waitlist for SignalKit.",
  },
  hero: {
    headline: "Find the first users who actually need your next product.",
    subheadline:
      "A tiny validation waitlist that captures demand signals, survey evidence, and relevant referrals before you build too much.",
    ctaLabel: "Join waitlist",
  },
  capture: {
    collectFirstName: false,
    firstNameLabel: "First name",
    emailLabel: "Email address",
  },
  offer: {
    text: "Join the early research group and help shape the first version before public launch.",
  },
  founderVideo: {
    enabled: false,
    title: "Founder preview",
  },
  reasons: [
    {
      title: "Capture real intent",
      description: "Start with email, then ask the questions that prove whether demand is specific.",
    },
    {
      title: "Qualify the right people",
      description: "Use configured survey answers to understand urgency, fit, and use cases.",
    },
    {
      title: "Measure referral pull",
      description: "Give every signup a stable link so interested people can bring similar users.",
    },
  ],
  faq: [
    {
      question: "Is this a full marketing website?",
      answer: "No. This is a focused validation waitlist designed to test demand, not sell every feature.",
    },
    {
      question: "Can I change the questions?",
      answer: "Yes. The survey is configured in one typed project config file.",
    },
    {
      question: "Where is the data stored?",
      answer: "Local JSON is available for development. Production deployments should use Postgres with DATABASE_URL.",
    },
  ],
  survey: {
    introTitle: "You're in. One more thing...",
    introDescription: "A few quick answers help us understand whether this is genuinely useful.",
    questions: [
      {
        id: "role",
        type: "single_select",
        label: "Which best describes you?",
        required: true,
        options: [
          { label: "Founder", value: "founder" },
          { label: "Operator", value: "operator" },
          { label: "Product lead", value: "product" },
          { label: "Engineer", value: "engineer" },
        ],
      },
      {
        id: "problem",
        type: "short_text",
        label: "What problem are you trying to validate?",
        required: true,
        placeholder: "A short description is enough.",
      },
      {
        id: "urgency",
        type: "scale",
        label: "How urgent is this for you?",
        min: 1,
        max: 5,
        minLabel: "Low",
        maxLabel: "High",
        required: true,
      },
      {
        id: "context",
        type: "long_text",
        label: "Anything else we should know?",
        placeholder: "Optional context, current workaround, or ideal outcome.",
      },
    ],
  },
  referral: {
    enabled: true,
    rewardCopy: "Know someone else validating a product idea? Share your link with them.",
    thresholdCopy: "Relevant referrals help us prioritize early access.",
  },
  footer: {
    text: "Open-source validation waitlist by ExitOS.",
    links: [{ label: "GitHub", href: "https://github.com/bromleyj04/exitos-waitlist" }],
  },
});
