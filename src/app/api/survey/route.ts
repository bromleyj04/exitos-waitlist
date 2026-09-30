import { NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const surveySchema = z.object({
  personId: z.string().min(1),
  responses: z.array(
    z.object({
      questionId: z.string().min(1).max(80),
      answer: z.union([z.string().max(4000), z.array(z.string().max(400)).max(30), z.number()]),
    }),
  ).max(30),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = surveySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Survey response is invalid." }, { status: 400 });
  }

  const storage = getStorage();
  await storage.saveSurveyResponses(parsed.data);
  const referralCount = await storage.countReferrals(parsed.data.personId);
  await trackEvent({
    name: "survey_completed",
    personId: parsed.data.personId,
    properties: { responseCount: parsed.data.responses.length },
  });

  return NextResponse.json({ ok: true, referralCount });
}
