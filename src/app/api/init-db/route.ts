import { NextRequest, NextResponse } from "next/server";
import { initDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const secret = request.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await initDB();
    return NextResponse.json({ success: true, message: "数据库表已创建" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
