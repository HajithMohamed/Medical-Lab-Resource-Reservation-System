import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pollMyNotifications } from "@/services/notifications";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
