import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { runDailyJob } from "@/services/daily-job";

function safeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function GET(req: NextRequest) {
  // If CRON_SECRET is missing or empty, return 404
  if (!env.CRON_SECRET || env.CRON_SECRET.trim() === "") {
    return new NextResponse(null, { status: 404 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!safeCompare(token, env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await runDailyJob();
    return NextResponse.json(counts);
  } catch (err) {
    console.error("[cron/daily] Error running daily job:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
