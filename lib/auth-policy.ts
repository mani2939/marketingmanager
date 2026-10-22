import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
export const ADMIN_USERNAME = "StrozpyManager";
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-strozpy_session"
    : "strozpy_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export function authenticationConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const password = env.STROZPY_ADMIN_PASSWORD ?? "";
  const secret = env.SESSION_SECRET ?? "";
  if (password.length < 12 || secret.length < 32) return null;
  return { password, secret };
}
export function credentialsMatch(
  username: string,
  password: string,
  expectedPassword: string,
) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  // Both checks always run; compare fixed-size digests without exposing password length.
  const validUser = timingSafeEqual(digest(username), digest(ADMIN_USERNAME));
  const validPassword = timingSafeEqual(
    digest(password),
    digest(expectedPassword),
  );
  return validUser && validPassword;
}
export function credentialVersion(password: string, secret: string) {
  return createHmac("sha256", secret)
    .update(ADMIN_USERNAME)
    .update("\0")
    .update(password)
    .digest("hex");
}
export function sessionHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function newSessionToken() {
  return randomBytes(32).toString("hex");
}
export function validSessionToken(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
