import { defineWaitlistProject } from "../schema";

export const supatriggerConfig = defineWaitlistProject({
  id: "supatrigger",
  name: "SupaTrigger",
  logo: { type: "text", text: "SupaTrigger" },
  brand: {
    name: "SupaTrigger",
    mark: { src: "/brand/signalkit-mark.svg", alt: "SupaTrigger temporary validation mark" },
    markDark: { src: "/brand/signalkit-mark-dark.svg", alt: "SupaTrigger temporary validation mark" },
    markLight: { src: "/brand/signalkit-mark-light.svg", alt: "SupaTrigger temporary validation mark" },
    favicon: "/favicon.svg",
  },
  theme: { defaultMode: "dark", preset: "minimal-dark", accent: "cyan" },
  seo: {
    title: "SupaTrigger waitlist",
    description: "Join the SupaTrigger validation waitlist.",
  },
  hero: {
    headline: "Turn database events into production workflows without the glue code.",
    subheadline:
      "Join the early validation group for a focused workflow layer built around Supabase teams.",
    ctaLabel: "Join waitlist",
  },
  capture: {
    collectFirstName: false,
    emailLabel: "Email address",
    firstNameLabel: "First name",
  },
  offer: {
    text: "Early users help shape the workflow API and get priority access to the private beta.",
  },
  founderVideo: {
    enabled: true,
    title: "Founder preview",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  reasons: [
    {
      title: "Validate real workflow demand",
      description: "Understand whether trigger orchestration is painful enough to adopt now.",
      visual: "capture-intent",
    },
    {
      title: "Find qualified early teams",
      description: "Identify builders with live Supabase apps and urgent automation needs.",
      visual: "qualify",
    },
    {
      title: "Shape the beta around proof",
      description: "Use survey and referral evidence before committing to a larger launch.",
      visual: "growth",
    },
  ],
  faq: [
    {
      question: "Is this a public launch?",
      answer: "No. This is a focused validation waitlist for early conversations and beta access.",
    },
    {
      question: "What happens after I join?",
      answer: "You will answer a short survey so we can understand your workflow needs and fit.",
    },
    {
      question: "Do referrals matter?",
      answer: "Yes. Relevant referrals help us spot concentrated demand in similar teams.",
    },
  ],
  survey: {
    introTitle: "You're in. One more thing...",
    introDescription: "Answer a few questions so we can understand whether this should exist for you.",
    questions: [
      {
        id: "role",
        type: "single_select",
        label: "Which best describes you?",
        required: true,
        options: [
          { label: "Founder", value: "founder" },
          { label: "Product engineer", value: "engineer" },
          { label: "Operator", value: "operator" },
          { label: "Other", value: "other" },
        ],
      },
      {
        id: "current_stack",
        type: "multi_select",
        label: "What are you using today?",
        options: [
          { label: "Supabase", value: "supabase" },
          { label: "Postgres triggers", value: "postgres_triggers" },
          { label: "Queues", value: "queues" },
          { label: "Zapier/Make", value: "automation_tools" },
        ],
      },
      {
        id: "urgency",
        type: "scale",
        label: "How urgent is this problem?",
        min: 1,
        max: 5,
        minLabel: "Curious",
        maxLabel: "Need it now",
        required: true,
      },
      {
        id: "use_case",
        type: "long_text",
        label: "What would you want to automate first?",
        placeholder: "Tell us about the workflow, trigger, or handoff.",
      },
    ],
  },
  referral: {
    enabled: true,
    rewardCopy: "Share your link with founders or engineers who would genuinely use this.",
    thresholdCopy: "Three relevant referrals moves you into the priority review group.",
  },
  footer: {
    text: "Powered by ExitOS Validation Waitlist.",
    links: [{ label: "GitHub", href: "https://github.com/bromleyj04/exitos-waitlist" }],
  },
});
