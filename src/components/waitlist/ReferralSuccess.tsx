"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import type { WaitlistProjectConfig } from "@/config/schema";
import { Button } from "@/components/ui/button";
import type { WaitlistPerson } from "@/lib/storage/types";

export function ReferralSuccess({
  config,
  person,
  referralCount,
  onReset,
}: {
  config: WaitlistProjectConfig;
  person: WaitlistPerson;
  referralCount: number;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const referralUrl = useMemo(() => {
    if (typeof window === "undefined") return `?ref=${person.referralCode}`;
    return `${window.location.origin}${window.location.pathname}?ref=${person.referralCode}`;
  }, [person.referralCode]);

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "referral_link_copied",
        personId: person.id,
        properties: { referralCode: person.referralCode },
      }),
    });
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mx-auto mt-12 w-full max-w-2xl px-5 pb-20 text-center">
      <div className="rounded-[calc(var(--radius)*1.6)] border border-border bg-surface p-6 shadow-soft backdrop-blur-[var(--backdrop-blur)] sm:p-8">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-5" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-foreground">Thanks. You&apos;re on the list.</h2>
        {config.referral.enabled ? (
          <>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">{config.referral.rewardCopy}</p>
            {config.referral.thresholdCopy ? (
              <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-muted-foreground">
                {config.referral.thresholdCopy}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="min-w-0 flex-1 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-left text-sm text-muted-foreground">
                <span className="block truncate">{referralUrl}</span>
              </div>
              <Button type="button" onClick={copyLink} className="gap-2">
                <Copy className="size-4" />
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Current referrals from your link: <span className="text-foreground">{referralCount}</span>
            </p>
          </>
        ) : null}
        <Button type="button" variant="ghost" onClick={onReset} className="mt-7">
          Back to waitlist
        </Button>
      </div>
    </section>
  );
}
