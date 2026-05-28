import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createToken, setTokenCookie, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { phone, password } = await request.json();

  if (!phone || !password) {
    return NextResponse.json({ error: "手机号和密码不能为空" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE phone = ${phone}`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "该手机号已注册" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const result = await sql`
    INSERT INTO users (phone, password_hash) VALUES (${phone}, ${passwordHash})
    RETURNING id, phone
  `;

  const user = result.rows[0];
  const token = await createToken(user.id, user.phone);
  const response = NextResponse.json({ success: true });
  setTokenCookie(response, token);
  return response;
}
