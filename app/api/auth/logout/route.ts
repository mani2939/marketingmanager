import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readyDatabase } from "@/lib/db";
import {
  SESSION_COOKIE,
  sameOrigin,
  sessionHash,
  validSessionToken,
} from "@/lib/auth-policy";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    if (token && validSessionToken(token)) {
      const sql = await readyDatabase();
      await sql`DELETE FROM strozpy_sessions WHERE token_hash=${sessionHash(token)}`;
    }
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not revoke your session. Please try signing out again." },
      { status: 503 },
    );
  }
}
