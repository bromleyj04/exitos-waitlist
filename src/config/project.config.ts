import { defineWaitlistProject } from "./schema";

export const projectConfig = defineWaitlistProject({
  id: "validation-demo",
  name: "SignalKit",
  logo: { type: "text", text: "SignalKit" },
  brand: {
    name: "SignalKit",
    mark: { src: "/brand/signalkit-mark.svg", alt: "SignalKit temporary validation mark" },
    markDark: { src: "/brand/signalkit-mark-dark.svg", alt: "SignalKit temporary validation mark" },
    markLight: { src: "/brand/signalkit-mark-light.svg", alt: "SignalKit temporary validation mark" },
    favicon: "/favicon.svg",
  },
  theme: { defaultMode: "dark", preset: "green-gradient", accent: "emerald" },
  seo: {
    title: "SignalKit validation waitlist",
    description: "Join the validation waitlist for SignalKit.",
  },
  hero: {
    headline: "Find early users before you build too much.",
    subheadline:
      "Receive the latest updates and get early access when the validation group opens.",
    ctaLabel: "Join waitlist",
  },
  capture: {
    collectFirstName: false,
    firstNameLabel: "First name",
    emailLabel: "your@email.com",
  },
  offer: {
    text: "Join the early research group and help shape the first version before public launch.",
  },
  proof: {
    enabled: false,
    label: "Built for",
    items: ["F", "operators", "signals", "teams"],
  },
  founderVideo: {
    enabled: true,
    title: "Founder preview",
  },
  reasons: [
    {
      title: "Capture real intent",
      description: "Start with email, then ask the questions that prove whether demand is specific.",
      visual: "capture-intent",
    },
    {
      title: "Qualify the right people",
      description: "Use configured survey answers to understand urgency, fit, and use cases.",
      visual: "qualify",
    },
    {
      title: "Measure referral pull",
      description: "Give every signup a stable link so interested people can bring similar users.",
      visual: "referral",
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
        type: "single_choice",
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
        type: "single_line",
        label: "What problem are you trying to validate?",
        required: true,
        placeholder: "A short description is enough.",
      },
      {
        id: "signals",
        type: "multi_choice",
        label: "Which signals would make this worth building?",
        description: "Choose the evidence you care about most.",
        required: true,
        maxSelections: 3,
        options: [
          { label: "People ask to pay", value: "paying_intent" },
          { label: "People invite similar users", value: "referrals" },
          { label: "People describe a painful workaround", value: "workaround" },
          { label: "People want a call or pilot", value: "pilot" },
        ],
      },
      {
        id: "timeline",
        type: "dropdown",
        label: "When would you want access?",
        required: true,
        placeholder: "Choose a timeline",
        options: [
          { label: "This week", value: "this_week" },
          { label: "This month", value: "this_month" },
          { label: "This quarter", value: "this_quarter" },
          { label: "Just researching", value: "researching" },
        ],
      },
      {
        id: "urgency",
        type: "number_range",
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
  integrations: {
    notion: {
      surveyMappings: {
        role: { property: "Role" },
        signals: { property: "Primary Use Cases" },
        timeline: { property: "Early Access Intent" },
        problem: { bodySection: "Problem to Validate" },
        urgency: { bodySection: "Urgency" },
        context: { bodySection: "Additional Context" },
      },
    },
  },
  referral: {
    enabled: true,
    rewardCopy: "Know someone else validating a product idea? Share your link with them.",
    thresholdCopy: "Relevant referrals help us prioritize early access.",
  },
  footer: {
    brand: "SignalKit",
    builtWith: { label: "Built using Waitli.st", href: "https://waitli.st" },
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "GitHub", href: "https://github.com/bromleyj04/exitos-waitlist" },
    ],
  },
});
