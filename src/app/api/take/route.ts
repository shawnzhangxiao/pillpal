import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id")!;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const { med } = await request.json();

  if (med !== "coq10" && med !== "folic_acid") {
    return NextResponse.json({ error: "无效的药品" }, { status: 400 });
  }

  // Ensure today's row exists
  await sql`
    INSERT INTO medication_logs (user_id, date)
    VALUES (${userId}, ${today})
    ON CONFLICT (user_id, date) DO NOTHING
  `;

  if (med === "coq10") {
    await sql`
      UPDATE medication_logs
      SET coq10_taken = true, coq10_time = ${now}
      WHERE user_id = ${userId} AND date = ${today}
    `;
  } else {
    await sql`
      UPDATE medication_logs
      SET folic_acid_taken = true, folic_acid_time = ${now}
      WHERE user_id = ${userId} AND date = ${today}
    `;
  }

  const result = await sql`
    SELECT coq10_taken, folic_acid_taken, coq10_time, folic_acid_time
    FROM medication_logs
    WHERE user_id = ${userId} AND date = ${today}
  `;

  const row = result.rows[0];

  return NextResponse.json({
    coq10: {
      taken: row?.coq10_taken || false,
      time: row?.coq10_time || null,
      pills: 1,
    },
    folic_acid: {
      taken: row?.folic_acid_taken || false,
      time: row?.folic_acid_time || null,
      pills: 2,
    },
  });
}
