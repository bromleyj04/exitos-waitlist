import type { WaitlistProjectConfig } from "@/config/schema";
import { LogoMark } from "./LogoMark";

export function WaitlistHero({ config }: { config: WaitlistProjectConfig }) {
  return (
    <header className="waitlist-hero mx-auto flex max-w-4xl flex-col items-center px-5 pb-8 pt-20 text-center sm:pt-28 lg:pt-32">
      <LogoMark brand={config.brand} />
      <h1 className="waitlist-hero__headline mt-12 max-w-4xl text-balance text-5xl leading-[1.04] tracking-[var(--hero-tracking)] text-foreground sm:text-6xl lg:text-7xl" style={{ fontWeight: "var(--hero-weight)" }}>
        {config.hero.headline}
      </h1>
      <p className="waitlist-hero__subheadline mt-7 max-w-2xl text-balance text-base leading-8 text-muted-foreground sm:text-lg">
        {config.hero.subheadline}
      </p>
    </header>
  );
}
