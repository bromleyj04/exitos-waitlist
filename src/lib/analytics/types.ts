export type AnalyticsEventName =
  | "page_view"
  | "waitlist_submit"
  | "survey_started"
  | "survey_completed"
  | "referral_link_copied"
  | "referral_signup"
  | "founder_video_played"
  | "followup_interest";

export type TrackEventInput = {
  name: AnalyticsEventName;
  personId?: string;
  properties?: Record<string, unknown>;
};

export interface AnalyticsAdapter {
  track(input: TrackEventInput): Promise<void>;
}

