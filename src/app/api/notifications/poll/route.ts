import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pollMyNotifications } from "@/services/notifications";
import { ensureDailyJobRan } from "@/services/daily-job";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger daily job check asynchronously (fire-and-forget)
  void ensureDailyJobRan().catch((err) => {
    console.warn("[api/notifications/poll] ensureDailyJobRan error:", err);
  });

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");

  try {
    const data = await pollMyNotifications(user, after);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/notifications/poll] Error polling notifications:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
