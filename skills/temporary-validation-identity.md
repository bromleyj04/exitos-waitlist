# Temporary Validation Identity

Use this skill when configuring an ExitOS Waitlist Kit project that needs a project mark above the hero headline and matching favicon/web assets.

This is not a logo maker workflow. It is a small automated step during Validation:

```txt
project context -> one credible temporary SVG mark -> founder approval -> generated assets -> waitlist launch
```

The mark is deliberately temporary. It should be good enough for a founder to share the Validation page publicly, but easy to replace later without changing the waitlist system.

## Inputs To Consume

Prefer existing context. Do not ask the founder to repeat information the ExitOS or waitli.st setup flow already knows.

Use:

- product name;
- one-line explanation;
- positioning;
- ideal customer profile or audience;
- key use cases;
- tone of voice;
- selected waitlist theme;
- accent and theme colors;
- any supplied logo, mark, favicon, brand file, or visual reference.

For standalone waitli.st users, first establish only the missing context needed to configure the waitlist. Do not open a branding workshop.

## Step 1: Existing Identity Check

Look for approved identity assets before creating anything new.

Check:

- `src/config/project.config.ts`;
- `public/brand/`;
- `public/favicon*`;
- `public/logo*`;
- supplied attachments or design files;
- README or product docs mentioning a logo/mark.

If an approved logo or mark exists:

1. Do not redesign it.
2. Place the source assets under `public/brand/`.
3. Configure `brand.mark`, `brand.markDark`, `brand.markLight`, and `brand.favicon`.
4. Run `npm run generate:brand-assets`.

## Step 2: Derive One Visual Concept

If no identity exists, derive a simple visual concept from the project context.

Think about:

- what the product does;
- the strongest true concept or metaphor;
- audience expectations;
- personality and tone;
- selected waitlist theme;
- whether the mark can be explained in one sentence.

Do not default to an initial, monogram, or stylised first letter. A letterform is allowed only when the product name itself is the strongest strategic signal and the mark still works as a distinctive symbol. Most Validation marks should be pictorial, abstract, or structural symbols based on the product's promise.

Avoid generic AI/startup clichés, including sparkles, brains, robots, magic wands, neural nodes, and default lightning bolts unless the product uniquely justifies them.

Useful references and lessons:

- Study `kaankiziltug/logo-design-skill` for design discipline: brief, word map, mark type choice, geometric construction, small-size testing, one-colour testing, and concept rationale.
- Study `sacredvoid/logo-generator` for its context scan, adaptive missing-context questions, variant preview, and export discipline. ExitOS deliberately presents one recommended mark, not 2-3 concepts.
- Study LogoLoom for its reliable SVG-to-asset export approach: clean source SVG, optimization, favicon/icon raster output, and predictable asset locations.
- Do not vendor or copy its trademark reference library into this repository.
- Keep ExitOS stricter than a logo-design workflow: internally explore possibilities if needed, but present one recommended temporary mark.

## Step 3: Create One Recommended Mark

Create exactly one recommended mark. Do not generate a large concept set.

ExitOS posture:

```txt
agent does the thinking -> founder makes one simple decision
```

The mark must:

- be vector-first SVG;
- use `viewBox="0 0 512 512"`;
- contain no text;
- use simple deliberate geometry;
- remain readable at 16px and 32px favicon size;
- work around 64-96px above the waitlist headline;
- work in monochrome;
- work on light and dark backgrounds;
- avoid excessive detail;
- avoid relying on gradients for recognisability;
- feel credible enough for a public Validation page;
- remain replaceable later.

Before drawing, write one sentence in your notes:

```txt
This mark represents [specific concept] because [truth from the project context].
```

If that sentence could describe dozens of unrelated startups, keep thinking.

Start black-and-white first. Add theme colour only after the silhouette works. Do not use colour, gradients, shadows, or glass effects to rescue weak geometry.

Construction guidance:

- Prefer a small number of geometric primitives.
- Keep the optical center balanced inside the 512px viewBox.
- Leave enough inner/outer padding for favicon rendering.
- Avoid thin negative-space cuts unless they remain readable at 16px.
- Use fills over strokes when possible; if strokes are necessary, keep them sturdy.
- Keep source SVG hand-readable and deterministic.
- Do not use text elements; if an imported mark contains text, convert or replace it before export.

Recommended file structure:

```txt
public/brand/{project-id}-mark.svg
public/brand/{project-id}-mark-dark.svg
public/brand/{project-id}-mark-light.svg
```

## Step 4: Internal Quality Checks

Before showing the founder, review and revise internally.

Run these checks:

- **Silhouette:** still recognisable in one color?
- **Favicon:** readable at 16px and 32px?
- **Hero:** balanced around 80px?
- **Light/dark:** works on both light and dark backgrounds?
- **Genericity:** could this belong to 100 unrelated AI startups?
- **Concept:** can the rationale be explained in one sentence using something true about this product?
- **SVG validity:** opens in a browser and contains no external scripts, images, fonts, or remote references?
- **Asset pipeline:** can `npm run generate:brand-assets` render it through Sharp without errors?

If it fails any check, revise before presenting it.

Hard rejection checks:

- It looks like a broken or accidental letter.
- It resembles a stock app icon.
- It needs the product name beside it to make sense.
- It contains thin cuts, tiny notches, or decorative details that collapse at favicon size.
- It looks like an AI-generated logo trend rather than a simple identifier.
- It cannot be redrawn from memory after a quick glance.

## Step 5: Founder Checkpoint

Show only the recommended mark.

Include:

```txt
Recommended Temporary Mark
[mark at hero size]
[favicon preview]

Why this mark: [one short sentence]
```

Ask for:

```txt
Approve / Revise
```

Do not ask a branding questionnaire.

## Step 6: Asset Generation

After approval:

1. Configure the project:

```ts
brand: {
  name: "Project Name",
  mark: { src: "/brand/project-mark.svg", alt: "Project Name temporary validation mark" },
  markDark: { src: "/brand/project-mark-dark.svg", alt: "Project Name temporary validation mark" },
  markLight: { src: "/brand/project-mark-light.svg", alt: "Project Name temporary validation mark" },
  favicon: "/favicon.svg"
}
```

2. Run:

```bash
npm run generate:brand-assets
```

3. Verify generated files:

```txt
public/favicon.svg
public/favicon.ico
public/favicon-16x16.png
public/favicon-32x32.png
public/favicon-48x48.png
public/apple-touch-icon.png
public/icon-192.png
public/icon-512.png
src/app/favicon.ico
```

4. Inspect at least:

```txt
public/favicon-16x16.png
public/favicon-32x32.png
public/icon-192.png
local waitlist hero mark
```

5. Run:

```bash
npm run lint
npm run build
```

6. If the generated raster assets look muddy or collapse at small sizes, revise the source SVG and regenerate. Do not patch the PNGs directly.

## Notes For AI Coding Agents

Preserve the waitlist layout and shared components. This skill configures identity assets; it should not turn the waitlist into a brand exploration, landing page redesign, or logo generator product.

Use project theme tokens and existing visual direction. Do not create a full brand system.
