import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorage } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics/server";

export const runtime = "nodejs";

const signupSchema = z.object({
  email: z.email().max(254),
  firstName: z.string().trim().max(80).optional(),
  ref: z.string().trim().max(32).nullable().optional(),
  source: z.string().trim().max(120).nullable().optional(),
  utm: z.record(z.string().max(80), z.string().max(240)).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const storage = getStorage();
  const result = await storage.createOrGetPerson({
    email: parsed.data.email,
    firstName: parsed.data.firstName,
    ref: parsed.data.ref ?? undefined,
    source: parsed.data.source ?? undefined,
    utm: parsed.data.utm,
  });
  const referralCount = await storage.countReferrals(result.person.id);

  await trackEvent({
    name: "waitlist_submit",
    personId: result.person.id,
    properties: {
      isNew: result.isNew,
      source: result.person.source,
      utm: result.person.utm,
      referredByCode: result.person.referredByCode,
    },
  });

  if (result.referral) {
    await trackEvent({
      name: "referral_signup",
      personId: result.person.id,
      properties: {
        referrerPersonId: result.referral.referrerPersonId,
        referralCode: result.referral.referralCode,
      },
    });
  }

  return NextResponse.json({ person: result.person, referralCount });
}
