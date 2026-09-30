import { NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics/server";

export const runtime = "nodejs";

const eventSchema = z.object({
  name: z.enum([
    "page_view",
    "waitlist_submit",
    "survey_started",
    "survey_completed",
    "referral_link_copied",
    "referral_signup",
    "founder_video_played",
    "followup_interest",
  ]),
  personId: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Event is invalid." }, { status: 400 });
  }

  await trackEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
