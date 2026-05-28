import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];
const CRON_PATH = "/api/notifications/send";
const INIT_DB_PATH = "/api/init-db";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const token = request.cookies.get("pillpal_token")?.value;
    if (token) {
      try {
        await verifyToken(token);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {}
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname === CRON_PATH || pathname === INIT_DB_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get("pillpal_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = await verifyToken(token);
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-phone", payload.phone);
    return response;
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("pillpal_token", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|service-worker).*)"],
};
