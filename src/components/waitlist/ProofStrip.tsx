import type { WaitlistProjectConfig } from "@/config/schema";

export function ProofStrip({ proof }: { proof: WaitlistProjectConfig["proof"] }) {
  if (!proof.enabled || proof.items.length === 0) return null;

  return (
    <section className="proof-strip mx-auto w-full max-w-xl px-5 text-center" aria-label={proof.label}>
      <div className="proof-strip__rule" />
      <p className="proof-strip__label">{proof.label}</p>
      <div className="proof-strip__items">
        {proof.items.map((item) => (
          <span key={item} className="proof-strip__item">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
