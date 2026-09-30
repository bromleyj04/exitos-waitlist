"use client";

import { useState } from "react";
import type { WaitlistProjectConfig } from "@/config/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WaitlistPerson } from "@/lib/storage/types";

type SignupResponse = {
  person: WaitlistPerson;
  referralCount: number;
};

export function EmailCapture({
  config,
  onSignup,
}: {
  config: WaitlistProjectConfig;
  onSignup: (result: SignupResponse) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const searchParams = new URLSearchParams(window.location.search);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: config.capture.collectFirstName ? firstName : undefined,
          ref: searchParams.get("ref"),
          source: searchParams.get("source") ?? searchParams.get("utm_source"),
          utm: Object.fromEntries(
            [...searchParams.entries()].filter(([key]) => key.startsWith("utm_")),
          ),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Something went wrong.");
      }

      onSignup(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="email-capture mx-auto mt-2 flex w-full max-w-2xl flex-col gap-3 px-5 sm:flex-row">
      {config.capture.collectFirstName ? (
        <Input
          aria-label={config.capture.firstNameLabel}
          autoComplete="given-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder={config.capture.firstNameLabel}
          className="email-capture__input sm:max-w-44"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <Input
          required
          type="email"
          aria-label={config.capture.emailLabel}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={config.capture.emailLabel}
          className="email-capture__input"
        />
        {error ? <p className="mt-2 text-left text-xs text-red-400">{error}</p> : null}
      </div>
      <Button type="submit" disabled={status === "submitting"} className="email-capture__button shrink-0">
        {status === "submitting" ? "Joining..." : config.hero.ctaLabel}
      </Button>
    </form>
  );
}
