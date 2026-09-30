"use client";

import { useEffect, useRef, useState } from "react";
import type { ThemePreset, WaitlistProjectConfig } from "@/config/schema";
import type { WaitlistPerson } from "@/lib/storage/types";
import { EmailCapture } from "./EmailCapture";
import { FAQAccordion } from "./FAQAccordion";
import { FounderVideo } from "./FounderVideo";
import { MinimalFooter } from "./MinimalFooter";
import { ReasonGrid } from "./ReasonGrid";
import { ReferralSuccess } from "./ReferralSuccess";
import { SurveyFlow } from "./SurveyFlow";
import { ValidationOffer } from "./ValidationOffer";
import { WaitlistHero } from "./WaitlistHero";

type Stage = "capture" | "survey" | "success";
type SavedFlow = {
  stage: Stage;
  person: WaitlistPerson | null;
  referralCount: number;
};

const themeAliases: Record<string, ThemePreset> = {
  light: "minimal-light",
  dark: "minimal-dark",
  warm: "warm-gradient",
  "minimal-light": "minimal-light",
  "minimal-dark": "minimal-dark",
  "warm-gradient": "warm-gradient",
};

const storageKey = "exit-os-waitlist-flow";

function readSavedFlow(): SavedFlow | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as SavedFlow) : null;
  } catch {
    return null;
  }
}

export function WaitlistPage({ config }: { config: WaitlistProjectConfig }) {
  const [stage, setStage] = useState<Stage>("capture");
  const [person, setPerson] = useState<WaitlistPerson | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const canPersistFlow = useRef(false);

  function transitionTo(nextStage: Stage, nextPerson: WaitlistPerson | null, nextReferralCount: number) {
    canPersistFlow.current = true;
    setStage(nextStage);
    setPerson(nextPerson);
    setReferralCount(nextReferralCount);
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ stage: nextStage, person: nextPerson, referralCount: nextReferralCount }),
    );
    window.history.pushState({ stage: nextStage }, "", window.location.href);
  }

  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get("theme");
    const preset = theme ? themeAliases[theme] : config.theme.preset;
    document.documentElement.dataset.theme = preset;
    document.documentElement.classList.toggle("dark", preset !== "minimal-light");

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "page_view",
        properties: {
          path: window.location.pathname,
          search: window.location.search,
        },
      }),
    });

    const restoreFrame = window.requestAnimationFrame(() => {
      const saved = readSavedFlow();
      if (saved?.person && saved.stage !== "capture") {
        canPersistFlow.current = true;
        setStage(saved.stage);
        setPerson(saved.person);
        setReferralCount(saved.referralCount ?? 0);
        window.history.replaceState({ stage: saved.stage }, "", window.location.href);
      } else {
        canPersistFlow.current = true;
      }
    });

    function handlePopState(event: PopStateEvent) {
      const nextStage = (event.state?.stage as Stage | undefined) ?? "capture";
      const savedFlow = readSavedFlow();
      setStage(nextStage);
      if (savedFlow?.person) {
        setPerson(savedFlow.person);
        setReferralCount(savedFlow.referralCount ?? 0);
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.cancelAnimationFrame(restoreFrame);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [config.theme.preset]);

  useEffect(() => {
    window.history.replaceState({ stage }, "", window.location.href);
  }, [stage]);

  useEffect(() => {
    if (!canPersistFlow.current) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify({ stage, person, referralCount }));
  }, [stage, person, referralCount]);

  return (
    <div className="app-shell min-h-screen overflow-hidden bg-background text-foreground">
      <main className="relative z-10">
        <WaitlistHero config={config} />
        {stage === "capture" ? (
          <>
            <EmailCapture
              config={config}
              onSignup={({ person: signedUpPerson, referralCount: count }) => {
                transitionTo("survey", signedUpPerson, count);
              }}
            />
            <ValidationOffer text={config.offer.text} />
            <FounderVideo video={config.founderVideo} />
            <ReasonGrid reasons={config.reasons} />
            <FAQAccordion faq={config.faq} />
          </>
        ) : null}

        {stage === "survey" && person ? (
          <SurveyFlow
            config={config}
            person={person}
            onComplete={(count) => {
              transitionTo("success", person, count);
            }}
          />
        ) : null}

        {stage === "success" && person ? (
          <ReferralSuccess config={config} person={person} referralCount={referralCount} />
        ) : null}
      </main>
      <MinimalFooter footer={config.footer} />
    </div>
  );
}
