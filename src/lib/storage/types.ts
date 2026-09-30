export type SurveyStatus = "not_started" | "started" | "completed";
export type ValidationStatus = "unreviewed" | "promising" | "not_fit" | "customer_commitment";

export type WaitlistPerson = {
  id: string;
  email: string;
  firstName?: string;
  referralCode: string;
  referredByCode?: string;
  referredByPersonId?: string;
  source?: string;
  utm: Record<string, string>;
  surveyStatus: SurveyStatus;
  validationStatus: ValidationStatus;
  createdAt: string;
  updatedAt: string;
};

export type SurveyResponse = {
  id: string;
  personId: string;
  questionId: string;
  answer: string | string[] | number;
  createdAt: string;
};

export type Referral = {
  id: string;
  referrerPersonId: string;
  referredPersonId: string;
  referralCode: string;
  qualified: boolean;
  createdAt: string;
};

export type AnalyticsEvent = {
  id: string;
  name: string;
  personId?: string;
  properties: Record<string, unknown>;
  createdAt: string;
};

export type CreatePersonInput = {
  email: string;
  firstName?: string;
  ref?: string;
  source?: string;
  utm?: Record<string, string>;
};

export type CreatePersonResult = {
  person: WaitlistPerson;
  isNew: boolean;
  referral?: Referral;
};

export type SaveSurveyInput = {
  personId: string;
  responses: Array<{
    questionId: string;
    answer: string | string[] | number;
  }>;
};

export type ValidationExport = {
  people: WaitlistPerson[];
  surveyResponses: SurveyResponse[];
  referrals: Referral[];
  events: AnalyticsEvent[];
};

export interface WaitlistStorage {
  createOrGetPerson(input: CreatePersonInput): Promise<CreatePersonResult>;
  getPersonById(id: string): Promise<WaitlistPerson | null>;
  getPersonByEmail(email: string): Promise<WaitlistPerson | null>;
  getPersonByReferralCode(code: string): Promise<WaitlistPerson | null>;
  saveSurveyStarted(personId: string): Promise<void>;
  saveSurveyResponses(input: SaveSurveyInput): Promise<void>;
  countReferrals(personId: string): Promise<number>;
  saveEvent(event: Omit<AnalyticsEvent, "id" | "createdAt">): Promise<void>;
  exportData(): Promise<ValidationExport>;
}

