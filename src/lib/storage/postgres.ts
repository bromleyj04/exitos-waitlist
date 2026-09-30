import { nanoid } from "nanoid";
import { Pool } from "pg";
import { createReferralCode } from "@/lib/referrals/codes";
import type {
  AnalyticsEvent,
  CreatePersonInput,
  CreatePersonResult,
  Referral,
  SaveSurveyInput,
  ValidationExport,
  WaitlistPerson,
  WaitlistStorage,
} from "./types";

let pool: Pool | null = null;
let initialized = false;
let initializing: Promise<void> | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the Postgres storage adapter.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
  });

  return pool;
}

async function ensureSchema() {
  if (initialized) return;
  if (initializing) return initializing;

  initializing = getPool()
    .query(`
      create table if not exists waitlist_people (
        id text primary key,
        email text not null unique,
        first_name text,
        referral_code text not null unique,
        referred_by_code text,
        referred_by_person_id text,
        source text,
        utm jsonb not null default '{}'::jsonb,
        survey_status text not null default 'not_started',
        validation_status text not null default 'unreviewed',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists survey_responses (
        id text primary key,
        person_id text not null references waitlist_people(id) on delete cascade,
        question_id text not null,
        answer jsonb not null,
        created_at timestamptz not null default now()
      );

      create table if not exists referrals (
        id text primary key,
        referrer_person_id text not null references waitlist_people(id) on delete cascade,
        referred_person_id text not null references waitlist_people(id) on delete cascade,
        referral_code text not null,
        qualified boolean not null default false,
        created_at timestamptz not null default now(),
        unique(referrer_person_id, referred_person_id)
      );

      create table if not exists analytics_events (
        id text primary key,
        name text not null,
        person_id text,
        properties jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );
    `)
    .then(() => {
      initialized = true;
    })
    .finally(() => {
      initializing = null;
    });

  return initializing;
}

function mapPerson(row: Record<string, unknown>): WaitlistPerson {
  return {
    id: String(row.id),
    email: String(row.email),
    firstName: row.first_name ? String(row.first_name) : undefined,
    referralCode: String(row.referral_code),
    referredByCode: row.referred_by_code ? String(row.referred_by_code) : undefined,
    referredByPersonId: row.referred_by_person_id ? String(row.referred_by_person_id) : undefined,
    source: row.source ? String(row.source) : undefined,
    utm: (row.utm as Record<string, string>) ?? {},
    surveyStatus: row.survey_status as WaitlistPerson["surveyStatus"],
    validationStatus: row.validation_status as WaitlistPerson["validationStatus"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

async function uniqueReferralCode() {
  let code = createReferralCode();
  let exists = true;

  while (exists) {
    const result = await getPool().query("select id from waitlist_people where referral_code = $1", [code]);
    exists = (result.rowCount ?? 0) > 0;
    if (exists) code = createReferralCode();
  }

  return code;
}

export class PostgresStorage implements WaitlistStorage {
  async createOrGetPerson(input: CreatePersonInput): Promise<CreatePersonResult> {
    await ensureSchema();

    const email = input.email.trim().toLowerCase();
    const existing = await this.getPersonByEmail(email);
    if (existing) {
      return { person: existing, isNew: false };
    }

    const referrer = input.ref ? await this.getPersonByReferralCode(input.ref) : null;
    const safeReferrer = referrer?.email === email ? null : referrer;
    const id = nanoid();
    const referralCode = await uniqueReferralCode();

    const result = await getPool().query(
      `insert into waitlist_people (
        id, email, first_name, referral_code, referred_by_code, referred_by_person_id, source, utm
      ) values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *`,
      [
        id,
        email,
        input.firstName?.trim() || null,
        referralCode,
        input.ref ?? null,
        safeReferrer?.id ?? null,
        input.source ?? null,
        JSON.stringify(input.utm ?? {}),
      ],
    );

    const person = mapPerson(result.rows[0]);
    let referral: Referral | undefined;

    if (safeReferrer && input.ref) {
      const referralResult = await getPool().query(
        `insert into referrals (id, referrer_person_id, referred_person_id, referral_code)
        values ($1, $2, $3, $4)
        returning *`,
        [nanoid(), safeReferrer.id, person.id, input.ref],
      );
      const row = referralResult.rows[0];
      referral = {
        id: row.id,
        referrerPersonId: row.referrer_person_id,
        referredPersonId: row.referred_person_id,
        referralCode: row.referral_code,
        qualified: row.qualified,
        createdAt: new Date(row.created_at).toISOString(),
      };
    }

    return { person, isNew: true, referral };
  }

  async getPersonById(id: string) {
    await ensureSchema();
    const result = await getPool().query("select * from waitlist_people where id = $1", [id]);
    return result.rows[0] ? mapPerson(result.rows[0]) : null;
  }

  async getPersonByEmail(email: string) {
    await ensureSchema();
    const result = await getPool().query("select * from waitlist_people where email = $1", [
      email.trim().toLowerCase(),
    ]);
    return result.rows[0] ? mapPerson(result.rows[0]) : null;
  }

  async getPersonByReferralCode(code: string) {
    await ensureSchema();
    const result = await getPool().query("select * from waitlist_people where referral_code = $1", [code]);
    return result.rows[0] ? mapPerson(result.rows[0]) : null;
  }

  async saveSurveyStarted(personId: string) {
    await ensureSchema();
    await getPool().query(
      `update waitlist_people
      set survey_status = case when survey_status = 'not_started' then 'started' else survey_status end,
          updated_at = now()
      where id = $1`,
      [personId],
    );
  }

  async saveSurveyResponses(input: SaveSurveyInput) {
    await ensureSchema();
    const client = await getPool().connect();

    try {
      await client.query("begin");
      await client.query("delete from survey_responses where person_id = $1", [input.personId]);

      for (const response of input.responses) {
        await client.query(
          `insert into survey_responses (id, person_id, question_id, answer)
          values ($1, $2, $3, $4)`,
          [nanoid(), input.personId, response.questionId, JSON.stringify(response.answer)],
        );
      }

      await client.query(
        "update waitlist_people set survey_status = 'completed', updated_at = now() where id = $1",
        [input.personId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async countReferrals(personId: string) {
    await ensureSchema();
    const result = await getPool().query("select count(*)::int as count from referrals where referrer_person_id = $1", [
      personId,
    ]);
    return Number(result.rows[0]?.count ?? 0);
  }

  async saveEvent(event: Omit<AnalyticsEvent, "id" | "createdAt">) {
    await ensureSchema();
    await getPool().query(
      "insert into analytics_events (id, name, person_id, properties) values ($1, $2, $3, $4)",
      [nanoid(), event.name, event.personId ?? null, JSON.stringify(event.properties)],
    );
  }

  async exportData(): Promise<ValidationExport> {
    await ensureSchema();
    const [people, surveyResponses, referrals, events] = await Promise.all([
      getPool().query("select * from waitlist_people order by created_at asc"),
      getPool().query("select * from survey_responses order by created_at asc"),
      getPool().query("select * from referrals order by created_at asc"),
      getPool().query("select * from analytics_events order by created_at asc"),
    ]);

    return {
      people: people.rows.map(mapPerson),
      surveyResponses: surveyResponses.rows.map((row) => ({
        id: row.id,
        personId: row.person_id,
        questionId: row.question_id,
        answer: row.answer,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      referrals: referrals.rows.map((row) => ({
        id: row.id,
        referrerPersonId: row.referrer_person_id,
        referredPersonId: row.referred_person_id,
        referralCode: row.referral_code,
        qualified: row.qualified,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      events: events.rows.map((row) => ({
        id: row.id,
        name: row.name,
        personId: row.person_id ?? undefined,
        properties: row.properties ?? {},
        createdAt: new Date(row.created_at).toISOString(),
      })),
    };
  }
}
