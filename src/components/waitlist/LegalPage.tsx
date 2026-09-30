import type { ReactNode } from "react";
import Link from "next/link";
import { MinimalFooter } from "@/components/waitlist/MinimalFooter";
import { projectConfig } from "@/config/project.config";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-3xl px-5 py-20 sm:py-28">
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 transition hover:text-foreground">
          Back to waitlist
        </Link>
        <h1 className="mt-10 text-4xl font-semibold tracking-[var(--hero-tracking)] sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-8 text-muted-foreground">{intro}</p>
        <div className="legal-content mt-12 space-y-8 text-sm leading-7 text-muted-foreground">{children}</div>
      </main>
      <MinimalFooter config={projectConfig} />
    </div>
  );
}
