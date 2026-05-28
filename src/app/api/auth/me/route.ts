import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const phone = request.headers.get("x-user-phone");
  return NextResponse.json({ id: userId, phone });
}
