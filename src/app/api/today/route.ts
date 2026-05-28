import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id")!;
  const today = new Date().toISOString().slice(0, 10);

  const result = await sql`
    SELECT coq10_taken, folic_acid_taken, coq10_time, folic_acid_time
    FROM medication_logs
    WHERE user_id = ${userId} AND date = ${today}
  `;

  const row = result.rows[0] || null;

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
