import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createToken, setTokenCookie, comparePassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { phone, password } = await request.json();

  if (!phone || !password) {
    return NextResponse.json({ error: "手机号和密码不能为空" }, { status: 400 });
  }

  const result = await sql`SELECT id, phone, password_hash FROM users WHERE phone = ${phone}`;
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "手机号未注册" }, { status: 401 });
  }

  const user = result.rows[0];
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = await createToken(user.id, user.phone);
  const response = NextResponse.json({ success: true, phone: user.phone });
  setTokenCookie(response, token);
  return response;
}
