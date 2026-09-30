import { createHmac } from "node:crypto";
import { projectConfig } from "@/config/project.config";
import type { Referral, SurveyResponse, WaitlistPerson } from "@/lib/storage/types";

type NotifyEventType = "prospect.created" | "prospect.survey_completed";

type NotionReference = {
  workspaceId?: string;
  databaseId?: string;
  pageId?: string;
  pageUrl?: string;
};

export type NotifyEventPayload = {
  eventId: string;
  eventType: NotifyEventType;
  occurredAt: string;
  project: {
    id: string;
    name: string;
  };
  prospect: {
    prospectId: string;
    email: string;
    name?: string;
    referralCode: string;
    referredByCode?: string;
    referredByPersonId?: string;
    source?: string;
    utm: Record<string, string>;
  };
  notion?: NotionReference;
  referral?: Referral;
  survey?: {
    completedAt: string;
    summary: string;
    answers: SurveyResponse[];
  };
};

type NotifyInput = {
  type: NotifyEventType;
  person: WaitlistPerson;
  notion?: NotionReference;
  referral?: Referral;
  responses?: SurveyResponse[];
};

const maxAttempts = 3;

function shouldRetry(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function eventId(type: NotifyEventType, prospectId: string) {
  return `${projectConfig.id}:${type}:${prospectId}`;
}

function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function summarizeResponses(responses: SurveyResponse[] = []) {
  if (responses.length === 0) return "Survey completed.";

  return responses
    .slice(0, 4)
    .map((response) => {
      const answer = Array.isArray(response.answer) ? response.answer.join(", ") : String(response.answer);
      return `${response.questionId}: ${answer}`;
    })
    .join("; ");
}

export function buildNotifyEvent(input: NotifyInput): NotifyEventPayload {
  const occurredAt = new Date().toISOString();

  return {
    eventId: eventId(input.type, input.person.id),
    eventType: input.type,
    occurredAt,
    project: {
      id: projectConfig.id,
      name: projectConfig.name,
    },
    prospect: {
      prospectId: input.person.id,
      email: input.person.email,
      name: input.person.firstName,
      referralCode: input.person.referralCode,
      referredByCode: input.person.referredByCode,
      referredByPersonId: input.person.referredByPersonId,
      source: input.person.source,
      utm: input.person.utm,
    },
    notion: input.notion,
    referral: input.referral,
    survey: input.responses
      ? {
          completedAt: input.person.updatedAt,
          summary: summarizeResponses(input.responses),
          answers: input.responses,
        }
      : undefined,
  };
}

export async function sendNotifyEvent(input: NotifyInput) {
  const endpoint = process.env.WAITLIST_NOTIFY_ENDPOINT;
  const secret = process.env.WAITLIST_NOTIFY_SECRET ?? process.env.WAITLIST_NOTIFY_TOKEN;

  if (!endpoint) return { ok: true, skipped: true };

  const payload = buildNotifyEvent(input);
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": payload.eventId,
    "x-waitlist-event": payload.eventType,
  };

  if (secret) {
    headers["x-waitlist-signature"] = `sha256=${signBody(body, secret)}`;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
      });

      if (response.ok || response.status === 409) {
        return { ok: true, eventId: payload.eventId, status: response.status };
      }

      if (!shouldRetry(response.status) || attempt === maxAttempts) {
        return { ok: false, eventId: payload.eventId, status: response.status };
      }

      const retryAfter = response.headers.get("retry-after");
      const retryDelay = retryAfter ? Number(retryAfter) * 1000 : 250 * attempt;
      await wait(Number.isFinite(retryDelay) ? retryDelay : 250 * attempt);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await wait(250 * attempt);
    }
  }

  return { ok: false, eventId: payload.eventId, error: lastError };
}
