import { NextResponse } from "next/server";
import { readyDatabase } from "@/lib/db";
import {
  ADMIN_USERNAME,
  SESSION_COOKIE,
  SESSION_SECONDS,
  authenticationConfig,
  credentialsMatch,
  credentialVersion,
  newSessionToken,
  sessionHash,
  sameOrigin,
} from "@/lib/auth-policy";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const config = authenticationConfig();
  if (!config)
    return NextResponse.json(
      {
        error:
          "Set STROZPY_ADMIN_PASSWORD (12+ characters) and SESSION_SECRET (32+ characters) in Vercel, then redeploy.",
      },
      { status: 503 },
    );
  const text = await request.text();
  if (text.length > 4096)
    return NextResponse.json(
      { error: "Invalid sign-in request." },
      { status: 400 },
    );
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Invalid sign-in request." },
      { status: 400 },
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("username" in body) ||
    !("password" in body) ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    body.username.length > 100 ||
    body.password.length > 1024
  )
    return NextResponse.json(
      { error: "Enter your username and password." },
      { status: 400 },
    );
  try {
    const sql = await readyDatabase();
    // A single shared admin account uses one durable bucket across all function instances.
    const [limit] =
      await sql`INSERT INTO strozpy_login_limits (key,attempts,resets_at) VALUES ('admin',1,now()+interval '15 minutes')
      ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN strozpy_login_limits.resets_at<=now() THEN 1 ELSE LEAST(strozpy_login_limits.attempts+1,11) END,
      resets_at=CASE WHEN strozpy_login_limits.resets_at<=now() THEN now()+interval '15 minutes' ELSE strozpy_login_limits.resets_at END
      RETURNING attempts, GREATEST(1,CEIL(EXTRACT(EPOCH FROM (resets_at-now())))) AS retry_after`;
    if (limit.attempts > 10)
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": String(limit.retry_after) } },
      );
    if (!credentialsMatch(body.username, body.password, config.password))
      return NextResponse.json(
        { error: "Incorrect username or password." },
        { status: 401 },
      );
    const token = newSessionToken();
    const previous = request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1);
    await sql.begin(async (tx) => {
      await tx`DELETE FROM strozpy_sessions WHERE expires_at <= now()`;
      if (previous)
        await tx`DELETE FROM strozpy_sessions WHERE token_hash=${sessionHash(previous)}`;
      await tx`INSERT INTO strozpy_sessions (token_hash,username,credential_version,expires_at) VALUES (${sessionHash(token)},${ADMIN_USERNAME},${credentialVersion(config.password, config.secret)},now()+interval '8 hours')`;
      await tx`DELETE FROM strozpy_login_limits WHERE key='admin'`;
    });
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch {
    console.error(
      "Administrator sign-in failed: database initialization or query failed.",
    );
    return NextResponse.json(
      {
        error:
          "Sign-in storage is unavailable. Check the Neon connection and deployment initialization logs.",
      },
      { status: 503 },
    );
  }
}
