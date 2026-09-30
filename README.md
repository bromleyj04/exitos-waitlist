# ExitOS Waitlist Kit

A free, open-source Validation waitlist runtime for founders who need evidence before they build too much.

Most waitlist templates stop at collecting an email address. ExitOS Waitlist Kit is built for the Validate stage: capture a signup, ask a short on-site survey, preserve referral and source attribution, generate a referral link, and export the evidence for human review.

It is deliberately small. It is not a SaaS marketing site, page builder, CMS, CRM, email sequence tool, dashboard, or scoring engine.

## Screenshots

Minimal light:

![Light theme](artifacts/screenshots/light.png)

Minimal dark:

![Dark theme](artifacts/screenshots/dark.png)

Warm gradient:

![Warm gradient theme](artifacts/screenshots/warm-gradient.png)

Mobile:

![Mobile theme](artifacts/screenshots/mobile.png)

Survey:

![Survey flow](artifacts/screenshots/survey.png)

Referral success:

![Referral success](artifacts/screenshots/referral-success.png)

## What Makes It Different

- It validates demand, not landing-page design taste.
- The page stays intentionally tiny: wordmark, headline, subheadline, email capture, offer line, optional founder video, exactly three outcomes, FAQ, footer.
- The first conversion is low friction, then the survey gathers real Validation evidence.
- Every signup gets a stable referral link.
- `validationStatus` exists for manual review, but v1 does not include automatic scoring.
- Project-specific content lives in typed config, not reusable components.
- Themes can create meaningful visual variation without changing Validation logic.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Owned shadcn-style primitives backed by Radix UI where useful
- Lucide icons
- `next/font`
- Zod validation
- Postgres via `pg`

## Local Setup

```bash
git clone https://github.com/bromleyj04/exitos-waitlist.git
cd exitos-waitlist
npm install
npm run dev
```

Open `http://localhost:3000`.

With no `DATABASE_URL`, local development uses `.data/waitlist.json`. That is only for development and demos.

## Environment Variables

Copy `.env.example` to `.env.local`.

```bash
DATABASE_URL=
POSTGRES_SSL=true
WAITLIST_STORAGE=postgres
EXPORT_TOKEN=
```

Production deployments should use Postgres through `DATABASE_URL`. File storage is development-only and throws in production.

## Project Config

Edit:

```txt
src/config/project.config.ts
```

That one file controls:

- `name`
- `logo`
- `theme`
- `seo`
- `hero`
- `capture`
- `offer`
- `founderVideo`
- `reasons`
- `faq`
- `survey`
- `referral`
- `footer`

The default demo is neutral. SupaTrigger is included only as an example config:

```txt
src/config/examples/supatrigger.config.ts
```

There is no SupaTrigger-specific logic or styling inside reusable components.

## Layout Contract

Template v1 has one layout:

- centered wordmark
- large centered headline
- short centered subheadline
- email input and one CTA
- short Validation offer line
- optional large 16:9 founder video
- exactly three outcome/reason blocks
- narrow centered FAQ accordion with no heading
- minimal footer

Do not add navigation, pricing, testimonials, feature grids, fake product dashboards, repeated CTA sections, or integration strips unless they are truly required for Validation.

## Survey

Survey questions live in `src/config/project.config.ts`.

Supported question types:

- `single_select`
- `multi_select`
- `short_text`
- `long_text`
- `scale`

The survey starts immediately after signup and completes on-site. There is no Typeform or Tally redirect by default.

## Referrals

Every person receives a stable referral code. Their share URL is:

```txt
https://your-domain.com?ref=CODE
```

The system attributes referred signups, prevents obvious self-referral where practical, counts raw referrals, and keeps raw referrals distinct from future qualified referrals. Referral `qualified` state exists in the data model, but v1 does not automatically qualify people.

## Themes

Theme presets are controlled by `theme.preset` in project config:

```ts
theme: {
  defaultMode: "dark",
  preset: "minimal-dark",
  accent: "emerald"
}
```

Included presets:

- `minimal-light`
- `minimal-dark`
- `warm-gradient`

Preview without editing config:

```txt
/?theme=minimal-light
/?theme=minimal-dark
/?theme=warm-gradient
```

Theme tokens live in `src/app/globals.css` and include:

- `--background`
- `--background-image`
- `--background-glow`
- `--foreground`
- `--muted`
- `--muted-foreground`
- `--surface`
- `--surface-tint`
- `--surface-opacity`
- `--border`
- `--primary`
- `--primary-foreground`
- `--accent`
- `--radius`
- `--shadow-soft`
- `--shadow-inner-soft`
- `--backdrop-blur`
- `--hero-weight`
- `--hero-tracking`

Tools such as PhotoGradient can be used to create static background inspiration or assets, but they are not dependencies and are not required for founder setup.

## Storage

Data model:

- `WaitlistPerson`
- `SurveyResponse`
- `Referral`
- `AnalyticsEvent`

Adapters:

- `FileStorage`: development only, writes `.data/waitlist.json`
- `PostgresStorage`: production, selected automatically when `DATABASE_URL` is present

The Postgres adapter creates the required tables if they do not exist.

Do not deploy to Vercel expecting `.data/waitlist.json` to persist. It will not.

## Analytics

The analytics boundary is intentionally small. Events are saved through the active storage adapter:

- `page_view`
- `waitlist_submit`
- `survey_started`
- `survey_completed`
- `referral_link_copied`
- `referral_signup`
- `founder_video_played`
- `followup_interest`

To add PostHog, Vercel Analytics, or another provider later, implement the `AnalyticsAdapter` interface in `src/lib/analytics/types.ts` and call it from `trackEvent`.

## Export Data

For local development JSON storage:

```bash
npm run export:data
```

This writes CSV files to `exports/`.

For deployed environments:

```bash
curl -H "Authorization: Bearer $EXPORT_TOKEN" https://your-domain.com/api/export
```

If `EXPORT_TOKEN` is unset, `/api/export` is public. Set it before using a real deployment.

## Deploy To Vercel

1. Create a Postgres database with a provider such as Neon, Supabase, Railway, Render, or Vercel-compatible Postgres.
2. Set `DATABASE_URL` in Vercel project environment variables.
3. Set `WAITLIST_STORAGE=postgres`.
4. Set `EXPORT_TOKEN`.
5. Deploy from GitHub.
6. Submit a signup, complete the survey, create a referred signup, and verify `/api/export`.

## Create Another Theme

1. Add a preset selector to `themePresetSchema` in `src/config/schema.ts`.
2. Add semantic token values in `src/app/globals.css`.
3. Keep shared components using semantic tokens.
4. Change component recipes only if the visual treatment genuinely requires it.
5. Do not add project-specific colors directly inside shared components.

## AI-Agent Setup Prompt

```txt
Use this repository as the foundation for my project's Validation waitlist.

First interview me or inspect the provided materials to understand:
- the product idea;
- target user;
- positioning;
- Validation offer;
- three strongest reasons or outcomes;
- FAQ;
- survey questions;
- referral incentive;
- preferred theme direction.

Then configure the existing boilerplate rather than redesigning it.

Use src/config/project.config.ts for project copy, SEO, offer, reasons, FAQ, survey, referral copy, and theme preset.
Use the survey object in that same config for all survey questions.
Use theme.preset and the semantic tokens in src/app/globals.css for visual changes.

Preserve the shared waitlist components unless there is a clear Validation reason to change them:
- WaitlistHero
- EmailCapture
- FounderVideo
- ReasonGrid
- FAQAccordion
- SurveyFlow
- ReferralSuccess
- MinimalFooter

Keep the waitlist minimal: centered wordmark, headline, subheadline, email capture, offer line, optional founder video, exactly three reasons, FAQ, and footer.
Do not add navigation, pricing, testimonials, dashboards, integration strips, repeated CTA sections, CMS behavior, auth, or scoring unless I explicitly ask and it is required for Validation.

Use local JSON storage only for development. For production, configure Postgres through DATABASE_URL.
After configuring, run lint/build, test signup, survey completion, referral attribution, export, mobile layout, and all theme presets.
```

## ExitOS

ExitOS is a methodology and operating system for taking business ideas through Ideate, Validate, Build, Launch, Scale, and Exit.

This repository is the reusable open-source waitlist runtime for the Validate stage. You can use it without using ExitOS, but its defaults are shaped by the principle: validate the idea, not the landing-page design.

## License

MIT. It is permissive, simple, and suitable for founders and teams who want to clone, modify, deploy, and use the kit commercially.
