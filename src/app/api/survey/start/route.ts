import { NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const startSchema = z.object({
  personId: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing person id." }, { status: 400 });
  }

  const storage = getStorage();
  await storage.saveSurveyStarted(parsed.data.personId);
  await trackEvent({ name: "survey_started", personId: parsed.data.personId });

  return NextResponse.json({ ok: true });
}
