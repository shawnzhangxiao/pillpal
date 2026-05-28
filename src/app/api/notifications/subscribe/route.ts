import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id")!;
  const subscription = await request.json();

  await sql`
    UPDATE users SET push_subscription = ${JSON.stringify(subscription)}::jsonb
    WHERE id = ${userId}
  `;

  return NextResponse.json({ success: true });
}
