import type { WaitlistProjectConfig } from "@/config/schema";

export function ReasonGrid({ reasons }: { reasons: WaitlistProjectConfig["reasons"] }) {
  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-5 py-24 text-center md:grid-cols-3 md:gap-12">
      {reasons.map((reason) => (
        <div key={reason.title} className="mx-auto max-w-xs">
          <h2 className="text-base font-semibold text-foreground">{reason.title}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{reason.description}</p>
        </div>
      ))}
    </section>
  );
}

