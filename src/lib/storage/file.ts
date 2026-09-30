import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { createReferralCode } from "@/lib/referrals/codes";
import type {
  AnalyticsEvent,
  CreatePersonInput,
  CreatePersonResult,
  Referral,
  SaveSurveyInput,
  SurveyResponse,
  ValidationExport,
  WaitlistPerson,
  WaitlistStorage,
} from "./types";

type FileDatabase = ValidationExport;

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "waitlist.json");

async function readDb(): Promise<FileDatabase> {
  await mkdir(dataDir, { recursive: true });

  try {
    return JSON.parse(await readFile(dataFile, "utf8")) as FileDatabase;
  } catch {
    return { people: [], surveyResponses: [], referrals: [], events: [] };
  }
}

async function writeDb(db: FileDatabase) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(db, null, 2)}\n`);
}

function now() {
  return new Date().toISOString();
}

async function uniqueReferralCode(db: FileDatabase) {
  let code = createReferralCode();
  while (db.people.some((person) => person.referralCode === code)) {
    code = createReferralCode();
  }
  return code;
}

export class FileStorage implements WaitlistStorage {
  async createOrGetPerson(input: CreatePersonInput): Promise<CreatePersonResult> {
    const db = await readDb();
    const email = input.email.trim().toLowerCase();
    const existing = db.people.find((person) => person.email === email);

    if (existing) {
      return { person: existing, isNew: false };
    }

    const referrer = input.ref
      ? db.people.find((person) => person.referralCode === input.ref && person.email !== email)
      : undefined;
    const timestamp = now();
    const person: WaitlistPerson = {
      id: nanoid(),
      email,
      firstName: input.firstName?.trim() || undefined,
      referralCode: await uniqueReferralCode(db),
      referredByCode: input.ref,
      referredByPersonId: referrer?.id,
      source: input.source,
      utm: input.utm ?? {},
      surveyStatus: "not_started",
      validationStatus: "unreviewed",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.people.push(person);

    let referral: Referral | undefined;
    if (referrer) {
      referral = {
        id: nanoid(),
        referrerPersonId: referrer.id,
        referredPersonId: person.id,
        referralCode: input.ref!,
        qualified: false,
        createdAt: timestamp,
      };
      db.referrals.push(referral);
    }

    await writeDb(db);
    return { person, isNew: true, referral };
  }

  async getPersonById(id: string) {
    const db = await readDb();
    return db.people.find((person) => person.id === id) ?? null;
  }

  async getPersonByEmail(email: string) {
    const db = await readDb();
    return db.people.find((person) => person.email === email.trim().toLowerCase()) ?? null;
  }

  async getPersonByReferralCode(code: string) {
    const db = await readDb();
    return db.people.find((person) => person.referralCode === code) ?? null;
  }

  async saveSurveyStarted(personId: string) {
    const db = await readDb();
    const person = db.people.find((item) => item.id === personId);
    if (person && person.surveyStatus === "not_started") {
      person.surveyStatus = "started";
      person.updatedAt = now();
      await writeDb(db);
    }
  }

  async saveSurveyResponses(input: SaveSurveyInput) {
    const db = await readDb();
    const timestamp = now();
    db.surveyResponses = db.surveyResponses.filter((item) => item.personId !== input.personId);
    db.surveyResponses.push(
      ...input.responses.map<SurveyResponse>((response) => ({
        id: nanoid(),
        personId: input.personId,
        questionId: response.questionId,
        answer: response.answer,
        createdAt: timestamp,
      })),
    );

    const person = db.people.find((item) => item.id === input.personId);
    if (person) {
      person.surveyStatus = "completed";
      person.updatedAt = timestamp;
    }

    await writeDb(db);
  }

  async countReferrals(personId: string) {
    const db = await readDb();
    return db.referrals.filter((referral) => referral.referrerPersonId === personId).length;
  }

  async saveEvent(event: Omit<AnalyticsEvent, "id" | "createdAt">) {
    const db = await readDb();
    db.events.push({ ...event, id: nanoid(), createdAt: now() });
    await writeDb(db);
  }

  async exportData() {
    return readDb();
  }
}

