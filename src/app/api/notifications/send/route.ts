import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendPush } from "@/lib/push";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const users = await sql`
    SELECT id, push_subscription FROM users
    WHERE push_subscription IS NOT NULL
    AND id NOT IN (
      SELECT user_id FROM medication_logs
      WHERE date = ${today} AND coq10_taken = true AND folic_acid_taken = true
    )
  `;

  let sent = 0;
  let failed = 0;

  for (const user of users.rows) {
    const logs = await sql`
      SELECT coq10_taken, folic_acid_taken FROM medication_logs
      WHERE user_id = ${user.id} AND date = ${today}
    `;
    const row = logs.rows[0];
    const missing: string[] = [];
    if (!row || !row.coq10_taken) missing.push("辅酶Q10(1粒)");
    if (!row || !row.folic_acid_taken) missing.push("叶酸(2粒)");

    if (missing.length === 0) continue;

    const result = await sendPush(user.push_subscription, {
      title: "服药提醒",
      body: `该吃药了：${missing.join("、")}`,
      url: "/dashboard",
    });

    if (result === "sent") sent++;
    else if (result === "expired") {
      await sql`UPDATE users SET push_subscription = NULL WHERE id = ${user.id}`;
      failed++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}
