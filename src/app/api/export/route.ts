import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = process.env.EXPORT_TOKEN;

  if (token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const data = await getStorage().exportData();
  return NextResponse.json(data);
}

