import type { WaitlistProjectConfig } from "@/config/schema";

export function MinimalFooter({ footer }: { footer: WaitlistProjectConfig["footer"] }) {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 border-t border-border px-5 py-8 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
      <p>{footer.text}</p>
      {footer.links.length > 0 ? (
        <div className="flex items-center gap-4">
          {footer.links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </footer>
  );
}

