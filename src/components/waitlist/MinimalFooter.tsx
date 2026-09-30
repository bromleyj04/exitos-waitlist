import type { WaitlistProjectConfig } from "@/config/schema";
import Link from "next/link";
import { LogoMark } from "./LogoMark";

function FooterLink({ href, label }: { href: string; label: string }) {
  const className = "transition hover:text-foreground";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}

export function MinimalFooter({ config }: { config: WaitlistProjectConfig }) {
  const { footer } = config;

  return (
    <footer className="footer-shell mx-auto w-full max-w-6xl border-t border-border px-5 py-12 text-sm text-muted-foreground">
      <div className="grid gap-8 text-center md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="flex justify-center md:justify-start">
          <LogoMark brand={config.brand} />
        </div>
        {footer.builtWith ? (
          <a href={footer.builtWith.href} className="text-sm underline underline-offset-4 transition hover:text-foreground">
            {footer.builtWith.label}
          </a>
        ) : null}
        {footer.links.length > 0 ? (
          <nav aria-label="Footer links" className="flex flex-wrap items-center justify-center gap-5 text-sm md:justify-end">
            {footer.links.map((link) => (
              <FooterLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
