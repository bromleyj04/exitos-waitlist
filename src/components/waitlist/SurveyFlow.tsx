"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SurveyQuestion, WaitlistProjectConfig } from "@/config/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WaitlistPerson } from "@/lib/storage/types";

type AnswerValue = string | string[] | number;
type Answers = Record<string, AnswerValue>;

function defaultAnswer(question: SurveyQuestion): AnswerValue {
  if (question.type === "multi_select" || question.type === "multi_choice") return [];
  if (question.type === "scale" || question.type === "number_range" || question.type === "slider") return question.min;
  return "";
}

function isAnswered(question: SurveyQuestion, answer: AnswerValue | undefined) {
  if (!question.required) return true;
  if (Array.isArray(answer)) return answer.length > 0;
  return answer !== undefined && String(answer).trim().length > 0;
}

export function SurveyFlow({
  config,
  person,
  onComplete,
}: {
  config: WaitlistProjectConfig;
  person: WaitlistPerson;
  onComplete: (referralCount: number) => void;
}) {
  const questions = config.survey.questions;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(questions.map((question) => [question.id, defaultAnswer(question)])),
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  const question = questions[step];
  const progress = Math.round(((step + 1) / questions.length) * 100);
  const currentAnswered = question ? isAnswered(question, answers[question.id]) : false;
  const canSubmit = useMemo(
    () => questions.every((candidate) => isAnswered(candidate, answers[candidate.id])),
    [answers, questions],
  );

  useEffect(() => {
    fetch("/api/survey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: person.id }),
    });
  }, [person.id]);

  function updateAnswer(questionId: string, answer: AnswerValue) {
    setError("");
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  function handleBack() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  function handleNext() {
    if (!question || !currentAnswered) {
      setError("Please answer this question to continue.");
      return;
    }

    setError("");
    setStep((current) => Math.min(questions.length - 1, current + 1));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!canSubmit) {
      setError("Please answer the required questions.");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: person.id,
          responses: questions.map((candidate) => ({
            questionId: candidate.id,
            answer: answers[candidate.id],
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save your answers.");
      }

      onComplete(payload.referralCount ?? 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your answers.");
      setStatus("idle");
    }
  }

  if (!question) return null;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-20 pt-16 text-left sm:pt-24">
      <div className="rounded-[calc(var(--radius)*1.6)] border border-border bg-surface p-5 shadow-soft backdrop-blur-[var(--backdrop-blur)] sm:p-8">
        <div>
          <div className="flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span>
              Question {step + 1} of {questions.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-primary">{config.survey.introTitle}</p>
          <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            {question.label}
            {question.required ? <span className="text-primary"> *</span> : null}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {question.description ?? config.survey.introDescription}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <QuestionInput question={question} answer={answers[question.id]} onChange={updateAnswer} />

          {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}

          <div className="mt-8 flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={handleBack} disabled={step === 0 || status === "submitting"}>
              Back
            </Button>
            {step < questions.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={!currentAnswered} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={status === "submitting" || !canSubmit} className="flex-1">
                {status === "submitting" ? "Saving..." : "Submit answers"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function QuestionInput({
  question,
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerValue;
  onChange: (questionId: string, answer: AnswerValue) => void;
}) {
  if (question.type === "single_line" || question.type === "short_text") {
    return (
      <SingleLineQuestion
        question={question}
        value={String(answer ?? "")}
        onChange={(value) => onChange(question.id, value)}
      />
    );
  }

  if (question.type === "long_text") {
    return (
      <LongTextQuestion
        question={question}
        value={String(answer ?? "")}
        onChange={(value) => onChange(question.id, value)}
      />
    );
  }

  if (question.type === "dropdown") {
    return (
      <DropdownQuestion
        question={question}
        value={String(answer ?? "")}
        onChange={(value) => onChange(question.id, value)}
      />
    );
  }

  if (question.type === "scale" || question.type === "number_range") {
    return (
      <NumberRangeQuestion
        question={question}
        value={Number(answer)}
        onChange={(value) => onChange(question.id, value)}
      />
    );
  }

  if (question.type === "slider") {
    return <SliderQuestion question={question} value={Number(answer)} onChange={(value) => onChange(question.id, value)} />;
  }

  if (question.type === "multi_select" || question.type === "multi_choice") {
    return (
      <MultiChoiceQuestion
        question={question}
        selected={Array.isArray(answer) ? answer : []}
        onChange={(value) => onChange(question.id, value)}
      />
    );
  }

  return (
    <SingleChoiceQuestion
      question={question}
      value={String(answer ?? "")}
      onChange={(value) => onChange(question.id, value)}
    />
  );
}

function SingleLineQuestion({
  question,
  value,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "single_line" | "short_text" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={question.placeholder}
      className="h-[3.25rem] text-base"
    />
  );
}

function LongTextQuestion({
  question,
  value,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "long_text" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Textarea
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={question.placeholder}
      className="min-h-36 text-base"
    />
  );
}

function SingleChoiceQuestion({
  question,
  value,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "single_choice" | "single_select" | "radio" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {question.options.map((option) => (
        <label
          key={option.value}
          className={`flex min-h-14 cursor-pointer items-center rounded-[var(--radius)] border px-4 text-sm font-medium transition ${
            value === option.value
              ? "border-primary bg-primary/12 text-foreground"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          <input
            type="radio"
            name={question.id}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mr-3 accent-[var(--primary)]"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function MultiChoiceQuestion({
  question,
  selected,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "multi_choice" | "multi_select" }>;
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="grid gap-3">
      {question.options.map((option) => {
        const checked = selected.includes(option.value);
        const maxReached = Boolean(question.maxSelections && selected.length >= question.maxSelections && !checked);

        return (
          <label
            key={option.value}
            className={`flex min-h-14 cursor-pointer items-center rounded-[var(--radius)] border px-4 text-sm font-medium transition ${
              checked
                ? "border-primary bg-primary/12 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            } ${maxReached ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={maxReached}
              onChange={() => {
                const next = checked
                  ? selected.filter((candidate) => candidate !== option.value)
                  : [...selected, option.value];
                onChange(next);
              }}
              className="mr-3 accent-[var(--primary)]"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function DropdownQuestion({
  question,
  value,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "dropdown" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = question.options.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={dropdownRef}>
      <button
        type="button"
        autoFocus
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface px-4 text-left text-base text-foreground shadow-inner-soft outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label ?? question.placeholder ?? "Choose an option"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="mt-2 overflow-hidden rounded-[var(--radius)] border border-border bg-surface p-1 shadow-soft"
        >
          {question.options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex min-h-12 w-full items-center rounded-[calc(var(--radius)*0.75)] px-3 text-left text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NumberRangeQuestion({
  question,
  value,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "number_range" | "scale" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const values = Array.from({ length: question.max - question.min + 1 }, (_, index) => question.min + index);

  return (
    <div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => onChange(candidate)}
            className={`h-12 rounded-[var(--radius)] border text-sm font-semibold transition ${
              value === candidate
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {candidate}
          </button>
        ))}
      </div>
      <RangeLabels minLabel={question.minLabel} maxLabel={question.maxLabel} />
    </div>
  );
}

function SliderQuestion({
  question,
  value,
  onChange,
}: {
  question: Extract<SurveyQuestion, { type: "slider" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-5">
        <input
          type="range"
          min={question.min}
          max={question.max}
          step={question.step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 flex-1 accent-[var(--primary)]"
        />
        <output className="grid size-12 place-items-center rounded-[var(--radius)] border border-border bg-surface text-sm font-semibold text-foreground">
          {value}
        </output>
      </div>
      <RangeLabels minLabel={question.minLabel} maxLabel={question.maxLabel} />
    </div>
  );
}

function RangeLabels({ minLabel, maxLabel }: { minLabel?: string; maxLabel?: string }) {
  if (!minLabel && !maxLabel) return null;

  return (
    <div className="mt-3 flex justify-between text-xs text-muted-foreground">
      <span>{minLabel}</span>
      <span>{maxLabel}</span>
    </div>
  );
}
