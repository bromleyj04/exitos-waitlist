"use client";

import { useEffect, useMemo, useState } from "react";
import type { SurveyQuestion, WaitlistProjectConfig } from "@/config/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WaitlistPerson } from "@/lib/storage/types";

type AnswerValue = string | string[] | number;
type Answers = Record<string, AnswerValue>;

function defaultAnswer(question: SurveyQuestion): AnswerValue {
  if (question.type === "multi_select") return [];
  if (question.type === "scale") return question.min;
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
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(config.survey.questions.map((question) => [question.id, defaultAnswer(question)])),
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  const canSubmit = useMemo(
    () => config.survey.questions.every((question) => isAnswered(question, answers[question.id])),
    [answers, config.survey.questions],
  );

  useEffect(() => {
    fetch("/api/survey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: person.id }),
    });
  }, [person.id]);

  function updateAnswer(questionId: string, answer: AnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
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
          responses: config.survey.questions.map((question) => ({
            questionId: question.id,
            answer: answers[question.id],
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

  return (
    <section className="mx-auto mt-12 w-full max-w-2xl px-5 pb-20 text-left">
      <div className="rounded-[calc(var(--radius)*1.6)] border border-border bg-surface p-5 shadow-soft backdrop-blur-[var(--backdrop-blur)] sm:p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">{config.survey.introTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{config.survey.introDescription}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-7">
          {config.survey.questions.map((question) => (
            <fieldset key={question.id} className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                {question.label}
                {question.required ? <span className="text-primary"> *</span> : null}
              </legend>
              {question.description ? (
                <p className="text-sm leading-6 text-muted-foreground">{question.description}</p>
              ) : null}
              <QuestionInput question={question} answer={answers[question.id]} onChange={updateAnswer} />
            </fieldset>
          ))}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" disabled={status === "submitting" || !canSubmit} className="w-full">
            {status === "submitting" ? "Saving..." : "Submit answers"}
          </Button>
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
  if (question.type === "short_text") {
    return (
      <Input
        value={String(answer ?? "")}
        onChange={(event) => onChange(question.id, event.target.value)}
        placeholder={question.placeholder}
      />
    );
  }

  if (question.type === "long_text") {
    return (
      <Textarea
        value={String(answer ?? "")}
        onChange={(event) => onChange(question.id, event.target.value)}
        placeholder={question.placeholder}
      />
    );
  }

  if (question.type === "scale") {
    const values = Array.from({ length: question.max - question.min + 1 }, (_, index) => question.min + index);
    return (
      <div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(question.id, value)}
              className={`h-11 rounded-[var(--radius)] border text-sm font-medium transition ${
                answer === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        {(question.minLabel || question.maxLabel) ? (
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{question.minLabel}</span>
            <span>{question.maxLabel}</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (question.type === "multi_select") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center rounded-[var(--radius)] border px-3 text-sm transition ${
                checked
                  ? "border-primary bg-primary/12 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = checked
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value];
                  onChange(question.id, next);
                }}
                className="mr-2 accent-[var(--primary)]"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {question.options.map((option) => (
        <label
          key={option.value}
          className={`flex min-h-11 cursor-pointer items-center rounded-[var(--radius)] border px-3 text-sm transition ${
            answer === option.value
              ? "border-primary bg-primary/12 text-foreground"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          <input
            type="radio"
            name={question.id}
            checked={answer === option.value}
            onChange={() => onChange(question.id, option.value)}
            className="mr-2 accent-[var(--primary)]"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
