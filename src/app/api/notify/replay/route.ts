import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const replaySchema = z.object({
  personId: z.string().min(1),
  eventType: z.enum(["prospect.created", "prospect.survey_completed"]),
});

function authorized(request: Request) {
  const token = process.env.NOTIFY_REPLAY_TOKEN ?? process.env.EXPORT_TOKEN;
  if (!token) return false;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = replaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Replay request is invalid." }, { status: 400 });
  }

  const storage = getStorage();
  if (!storage.replayNotifyEvent) {
    return NextResponse.json({ error: "The active storage adapter does not support notify replay." }, { status: 409 });
  }

  const result = await storage.replayNotifyEvent(parsed.data.personId, parsed.data.eventType);
  return NextResponse.json({ ok: true, result });
}
