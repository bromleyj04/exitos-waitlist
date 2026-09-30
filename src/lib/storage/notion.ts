import { nanoid } from "nanoid";
import { projectConfig } from "@/config/project.config";
import { createReferralCode } from "@/lib/referrals/codes";
import { sendNotifyEvent } from "@/lib/notify/client";
import type {
  CreatePersonInput,
  CreatePersonResult,
  Referral,
  SaveSurveyInput,
  SurveyResponse,
  ValidationExport,
  WaitlistPerson,
  WaitlistStorage,
} from "./types";

type NotionProperty =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { email: string | null }
  | { date: { start: string } | null }
  | { select: { name: string } | null }
  | { multi_select: Array<{ name: string }> };

type NotionPage = {
  id: string;
  url?: string;
  properties: Record<string, unknown>;
};

type NotionReference = {
  workspaceId?: string;
  databaseId: string;
  pageId: string;
  pageUrl?: string;
};

const propertyNames = {
  title: "Prospect",
  prospectId: "Prospect ID",
  email: "Email",
  company: "Company",
  role: "Role",
  joinedAt: "Joined At",
  surveyStatus: "Survey Status",
  surveyCompletedAt: "Survey Completed At",
  source: "Source",
  primaryUseCases: "Primary Use Cases",
  earlyAccessIntent: "Early Access Intent",
  validationStatus: "Validation Status",
  referralCode: "Referral Code",
  referredBy: "Referred By",
  utmSource: "UTM Source",
  utmMedium: "UTM Medium",
  utmCampaign: "UTM Campaign",
  utmTerm: "UTM Term",
  utmContent: "UTM Content",
};

const requiredProperties = [
  propertyNames.title,
  propertyNames.prospectId,
  propertyNames.email,
  propertyNames.joinedAt,
  propertyNames.surveyStatus,
  propertyNames.referralCode,
  propertyNames.validationStatus,
];

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function textProperty(value?: string): NotionProperty {
  return { rich_text: value ? [{ text: { content: value } }] : [] };
}

function titleProperty(value: string): NotionProperty {
  return { title: [{ text: { content: value } }] };
}

function dateProperty(value?: string): NotionProperty {
  return { date: value ? { start: value } : null };
}

function selectProperty(value?: string): NotionProperty {
  return { select: value ? { name: value } : null };
}

function multiSelectProperty(values: string[]): NotionProperty {
  return { multi_select: values.map((name) => ({ name })) };
}

function richTextValue(property: unknown) {
  const richText = (property as { rich_text?: Array<{ plain_text?: string; text?: { content?: string } }> }).rich_text;
  return richText?.map((item) => item.plain_text ?? item.text?.content ?? "").join("") || undefined;
}

function titleValue(property: unknown) {
  const title = (property as { title?: Array<{ plain_text?: string; text?: { content?: string } }> }).title;
  return title?.map((item) => item.plain_text ?? item.text?.content ?? "").join("") || undefined;
}

function emailValue(property: unknown) {
  return (property as { email?: string | null } | undefined)?.email ?? undefined;
}

function dateValue(property: unknown) {
  return (property as { date?: { start?: string } | null } | undefined)?.date?.start;
}

function selectValue(property: unknown) {
  return (property as { select?: { name?: string } | null } | undefined)?.select?.name;
}

function notionSurveyStatus(status?: string): WaitlistPerson["surveyStatus"] {
  if (status === "Started") return "started";
  if (status === "Completed") return "completed";
  return "not_started";
}

function toNotionSurveyStatus(status: WaitlistPerson["surveyStatus"]) {
  if (status === "started") return "Started";
  if (status === "completed") return "Completed";
  return "Pending";
}

function validationStatus(status?: string): WaitlistPerson["validationStatus"] {
  if (status === "promising" || status === "Promising") return "promising";
  if (status === "not_fit" || status === "Not Fit") return "not_fit";
  if (status === "customer_commitment" || status === "Customer Commitment") return "customer_commitment";
  return "unreviewed";
}

function toValidationStatus(status: WaitlistPerson["validationStatus"]) {
  if (status === "promising") return "Promising";
  if (status === "not_fit") return "Not Fit";
  if (status === "customer_commitment") return "Customer Commitment";
  return "Unreviewed";
}

function splitChunks(text: string, size = 1900) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks.length ? chunks : [""];
}

function questionLabel(questionId: string) {
  return projectConfig.survey.questions.find((question) => question.id === questionId)?.label ?? questionId;
}

function questionOptionLabel(questionId: string, value: string) {
  const question = projectConfig.survey.questions.find((item) => item.id === questionId);
  if (!question || !("options" in question)) return value;
  return question.options.find((option) => option.value === value)?.label ?? value;
}

function displayAnswer(questionId: string, answer: string | string[] | number) {
  if (Array.isArray(answer)) return answer.map((value) => questionOptionLabel(questionId, value)).join(", ");
  if (typeof answer === "string") return questionOptionLabel(questionId, answer);
  return String(answer);
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class NotionStorage implements WaitlistStorage {
  private readonly token: string;
  private readonly databaseId: string;
  private readonly apiBaseUrl: string;
  private readonly workspaceId?: string;
  private schemaValidated = false;

  constructor() {
    if (!process.env.NOTION_TOKEN) {
      throw new Error("NOTION_TOKEN is required when WAITLIST_STORAGE=notion.");
    }
    if (!process.env.NOTION_DATABASE_ID) {
      throw new Error("NOTION_DATABASE_ID is required when WAITLIST_STORAGE=notion.");
    }

    this.token = process.env.NOTION_TOKEN;
    this.databaseId = process.env.NOTION_DATABASE_ID;
    this.apiBaseUrl = process.env.NOTION_API_BASE_URL ?? "https://api.notion.com/v1";
    this.workspaceId = process.env.NOTION_WORKSPACE_ID;
  }

  async createOrGetPerson(input: CreatePersonInput): Promise<CreatePersonResult> {
    await this.ensureSchema();

    const email = normalizeEmail(input.email);
    const existing = await this.getPersonByEmail(email);
    if (existing) {
      return { person: existing, isNew: false };
    }

    const referrer = input.ref ? await this.getPersonByReferralCode(input.ref) : null;
    const safeReferrer = referrer?.email === email ? null : referrer;
    const timestamp = now();
    const person: WaitlistPerson = {
      id: `pr_${nanoid(12)}`,
      email,
      firstName: input.firstName?.trim() || undefined,
      referralCode: await this.uniqueReferralCode(),
      referredByCode: input.ref,
      referredByPersonId: safeReferrer?.id,
      source: input.source,
      utm: input.utm ?? {},
      surveyStatus: "not_started",
      validationStatus: "unreviewed",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const page = await this.createPage(person);
    let referral: Referral | undefined;

    if (safeReferrer && input.ref) {
      referral = {
        id: `ref_${nanoid(12)}`,
        referrerPersonId: safeReferrer.id,
        referredPersonId: person.id,
        referralCode: input.ref,
        qualified: false,
        createdAt: timestamp,
      };
    }

    await this.emitNotify({
      type: "prospect.created",
      person,
      notion: this.notionReference(page),
      referral,
    });

    return { person, isNew: true, referral };
  }

  async getPersonById(id: string) {
    await this.ensureSchema();
    const page = await this.findPage(propertyNames.prospectId, "rich_text", id);
    return page ? this.mapPerson(page) : null;
  }

  async getPersonByEmail(email: string) {
    await this.ensureSchema();
    const page = await this.findPage(propertyNames.email, "email", normalizeEmail(email));
    return page ? this.mapPerson(page) : null;
  }

  async getPersonByReferralCode(code: string) {
    await this.ensureSchema();
    const page = await this.findPage(propertyNames.referralCode, "rich_text", code);
    return page ? this.mapPerson(page) : null;
  }

  async saveSurveyStarted(personId: string) {
    await this.ensureSchema();
    const page = await this.findPage(propertyNames.prospectId, "rich_text", personId);
    if (!page) return;
    const person = this.mapPerson(page);
    if (person.surveyStatus !== "not_started") return;

    await this.updatePage(page.id, {
      [propertyNames.surveyStatus]: selectProperty("Started"),
    });
  }

  async saveSurveyResponses(input: SaveSurveyInput) {
    await this.ensureSchema();
    const page = await this.findPage(propertyNames.prospectId, "rich_text", input.personId);
    if (!page) {
      throw new Error(`Cannot save survey responses. Prospect ${input.personId} was not found in Notion.`);
    }

    const completedAt = now();
    const properties = this.surveyProperties(input.responses, completedAt);
    await this.updatePage(page.id, properties);
    await this.appendSurveyAnswers(page.id, input.responses, completedAt);

    const updatedPage = await this.retrievePage(page.id);
    const person = this.mapPerson(updatedPage);
    const responses = input.responses.map<SurveyResponse>((response) => ({
      id: `sr_${nanoid(12)}`,
      personId: input.personId,
      questionId: response.questionId,
      answer: response.answer,
      createdAt: completedAt,
    }));

    await this.emitNotify({
      type: "prospect.survey_completed",
      person,
      notion: this.notionReference(updatedPage),
      responses,
    });
  }

  async countReferrals(personId: string) {
    await this.ensureSchema();
    const person = await this.getPersonById(personId);
    if (!person) return 0;

    const pages = await this.queryDatabase({
      property: propertyNames.referredBy,
      rich_text: {
        equals: person.referralCode,
      },
    });
    return pages.length;
  }

  async saveEvent() {
    return;
  }

  async exportData(): Promise<ValidationExport> {
    await this.ensureSchema();
    const pages = await this.queryDatabase();
    const people = pages.map((page) => this.mapPerson(page));
    const referrals = people
      .filter((person) => person.referredByCode)
      .map<Referral>((person) => {
        const referrer = people.find((candidate) => candidate.referralCode === person.referredByCode);
        return {
          id: `notion_ref_${person.id}`,
          referrerPersonId: referrer?.id ?? "",
          referredPersonId: person.id,
          referralCode: person.referredByCode!,
          qualified: false,
          createdAt: person.createdAt,
        };
      })
      .filter((referral) => referral.referrerPersonId);

    return { people, surveyResponses: [], referrals, events: [] };
  }

  async replayNotifyEvent(personId: string, eventType: "prospect.created" | "prospect.survey_completed") {
    await this.ensureSchema();
    const page = await this.findPage(propertyNames.prospectId, "rich_text", personId);
    if (!page) {
      throw new Error(`Prospect ${personId} was not found in Notion.`);
    }

    const person = this.mapPerson(page);
    if (eventType === "prospect.survey_completed" && person.surveyStatus !== "completed") {
      throw new Error("Cannot replay survey completion for a prospect whose survey is not completed.");
    }

    return sendNotifyEvent({
      type: eventType,
      person,
      notion: this.notionReference(page),
      responses: eventType === "prospect.survey_completed" ? [] : undefined,
    });
  }

  private async emitNotify(input: Parameters<typeof sendNotifyEvent>[0]) {
    try {
      const result = await sendNotifyEvent(input);
      if (!result.ok) {
        console.warn("Notify event delivery failed", result);
      }
    } catch (error) {
      console.warn("Notify event delivery failed", error);
    }
  }

  private async uniqueReferralCode() {
    let code = createReferralCode();
    while (await this.getPersonByReferralCode(code)) {
      code = createReferralCode();
    }
    return code;
  }

  private async ensureSchema() {
    if (this.schemaValidated) return;
    const database = await this.request<{ properties?: Record<string, unknown> }>(`/databases/${this.databaseId}`);
    const missing = requiredProperties.filter((property) => !database.properties?.[property]);
    if (missing.length) {
      throw new Error(`Notion database is missing required properties: ${missing.join(", ")}`);
    }
    this.schemaValidated = true;
  }

  private async createPage(person: WaitlistPerson) {
    return this.request<NotionPage>("/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties: this.personProperties(person),
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: { rich_text: [{ text: { content: "Survey Answers" } }] },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ text: { content: "Survey not completed yet." } }] },
          },
        ],
      }),
    });
  }

  private async retrievePage(pageId: string) {
    return this.request<NotionPage>(`/pages/${pageId}`);
  }

  private async updatePage(pageId: string, properties: Record<string, NotionProperty>) {
    return this.request<NotionPage>(`/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  }

  private async appendSurveyAnswers(pageId: string, responses: SaveSurveyInput["responses"], completedAt: string) {
    const mappings = projectConfig.integrations?.notion?.surveyMappings ?? {};
    const children = [
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "Survey Answers" } }] },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ text: { content: `Completed ${completedAt}` } }] },
      },
      ...responses.flatMap((response) =>
        splitChunks(
          [
            mappings[response.questionId]?.bodySection,
            questionLabel(response.questionId),
            displayAnswer(response.questionId, response.answer),
          ]
            .filter(Boolean)
            .join("\n"),
        ).map((content) => ({
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ text: { content } }] },
          })),
      ),
    ];

    await this.request(`/blocks/${pageId}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children }),
    });
  }

  private async findPage(property: string, type: "email" | "rich_text", value: string) {
    const filter =
      type === "email"
        ? { property, email: { equals: value } }
        : { property, rich_text: { equals: value } };
    const pages = await this.queryDatabase(filter);
    return pages[0] ?? null;
  }

  private async queryDatabase(filter?: Record<string, unknown>) {
    const pages: NotionPage[] = [];
    let startCursor: string | undefined;

    do {
      const response = await this.request<{ results: NotionPage[]; has_more?: boolean; next_cursor?: string }>(
        `/databases/${this.databaseId}/query`,
        {
          method: "POST",
          body: JSON.stringify({ filter, start_cursor: startCursor, page_size: 100 }),
        },
      );
      pages.push(...response.results);
      startCursor = response.has_more ? response.next_cursor : undefined;
    } while (startCursor);

    return pages;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(`${this.apiBaseUrl}${path}`, {
          ...init,
          headers: {
            authorization: `Bearer ${this.token}`,
            "content-type": "application/json",
            "notion-version": "2022-06-28",
            ...(init.headers ?? {}),
          },
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        if (response.status !== 429 && response.status < 500) {
          throw new Error(`Notion API request failed with ${response.status}: ${await response.text()}`);
        }

        if (attempt === 4) {
          throw new Error(`Notion API request failed after retries with ${response.status}: ${await response.text()}`);
        }

        const retryAfter = response.headers.get("retry-after");
        const retryDelay = retryAfter ? Number(retryAfter) * 1000 : 300 * attempt;
        await wait(Number.isFinite(retryDelay) ? retryDelay : 300 * attempt);
      } catch (error) {
        lastError = error;
        if (attempt === 4) break;
        await wait(300 * attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Notion API request failed.");
  }

  private personProperties(person: WaitlistPerson): Record<string, NotionProperty> {
    const prospectName = person.firstName || person.email;
    return {
      [propertyNames.title]: titleProperty(prospectName),
      [propertyNames.prospectId]: textProperty(person.id),
      [propertyNames.email]: { email: person.email },
      [propertyNames.joinedAt]: dateProperty(person.createdAt),
      [propertyNames.surveyStatus]: selectProperty(toNotionSurveyStatus(person.surveyStatus)),
      [propertyNames.source]: textProperty(person.source),
      [propertyNames.validationStatus]: selectProperty(toValidationStatus(person.validationStatus)),
      [propertyNames.referralCode]: textProperty(person.referralCode),
      [propertyNames.referredBy]: textProperty(person.referredByCode),
      [propertyNames.utmSource]: textProperty(person.utm.utm_source ?? person.utm.source),
      [propertyNames.utmMedium]: textProperty(person.utm.utm_medium ?? person.utm.medium),
      [propertyNames.utmCampaign]: textProperty(person.utm.utm_campaign ?? person.utm.campaign),
      [propertyNames.utmTerm]: textProperty(person.utm.utm_term ?? person.utm.term),
      [propertyNames.utmContent]: textProperty(person.utm.utm_content ?? person.utm.content),
    };
  }

  private surveyProperties(responses: SaveSurveyInput["responses"], completedAt: string): Record<string, NotionProperty> {
    const properties: Record<string, NotionProperty> = {
      [propertyNames.surveyStatus]: selectProperty("Completed"),
      [propertyNames.surveyCompletedAt]: dateProperty(completedAt),
    };

    const mappings = projectConfig.integrations?.notion?.surveyMappings ?? {};

    for (const response of responses) {
      const property = mappings[response.questionId]?.property;
      if (!property) continue;

      if (Array.isArray(response.answer)) {
        properties[property] = multiSelectProperty(response.answer.map((value) => questionOptionLabel(response.questionId, value)));
      } else if (typeof response.answer === "number") {
        properties[property] = selectProperty(String(response.answer));
      } else if (property === propertyNames.email) {
        properties[property] = { email: response.answer };
      } else if (
        property === propertyNames.earlyAccessIntent ||
        property === propertyNames.validationStatus ||
        property === propertyNames.surveyStatus
      ) {
        properties[property] = selectProperty(questionOptionLabel(response.questionId, response.answer));
      } else {
        properties[property] = textProperty(questionOptionLabel(response.questionId, response.answer));
      }
    }

    return properties;
  }

  private mapPerson(page: NotionPage): WaitlistPerson {
    const properties = page.properties;
    return {
      id: richTextValue(properties[propertyNames.prospectId]) ?? page.id,
      email: emailValue(properties[propertyNames.email]) ?? "",
      firstName: titleValue(properties[propertyNames.title]),
      referralCode: richTextValue(properties[propertyNames.referralCode]) ?? "",
      referredByCode: richTextValue(properties[propertyNames.referredBy]),
      source: richTextValue(properties[propertyNames.source]),
      utm: {
        source: richTextValue(properties[propertyNames.utmSource]) ?? "",
        medium: richTextValue(properties[propertyNames.utmMedium]) ?? "",
        campaign: richTextValue(properties[propertyNames.utmCampaign]) ?? "",
        term: richTextValue(properties[propertyNames.utmTerm]) ?? "",
        content: richTextValue(properties[propertyNames.utmContent]) ?? "",
      },
      surveyStatus: notionSurveyStatus(selectValue(properties[propertyNames.surveyStatus])),
      validationStatus: validationStatus(selectValue(properties[propertyNames.validationStatus])),
      createdAt: dateValue(properties[propertyNames.joinedAt]) ?? now(),
      updatedAt: dateValue(properties[propertyNames.surveyCompletedAt]) ?? dateValue(properties[propertyNames.joinedAt]) ?? now(),
    };
  }

  private notionReference(page: NotionPage): NotionReference {
    return {
      workspaceId: this.workspaceId,
      databaseId: this.databaseId,
      pageId: page.id,
      pageUrl: page.url,
    };
  }
}
