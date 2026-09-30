import type { WaitlistProjectConfig } from "@/config/schema";
import { ReasonVisual } from "@/lib/visuals/reason-visual-registry";

export function ReasonGrid({ reasons }: { reasons: WaitlistProjectConfig["reasons"] }) {
  return (
    <section className="reason-grid mx-auto grid w-full max-w-5xl grid-cols-1 gap-14 px-5 py-24 text-center md:grid-cols-3 md:gap-12">
      {reasons.map((reason) => (
        <div key={reason.title} className="reason-card mx-auto flex max-w-xs flex-col items-center">
          <ReasonVisual concept={reason.visual} />
          <h2 className="reason-card__title mt-8 text-base font-semibold text-foreground">{reason.title}</h2>
          <p className="reason-card__description mt-3 text-sm leading-7 text-muted-foreground">{reason.description}</p>
        </div>
      ))}
    </section>
  );
}
