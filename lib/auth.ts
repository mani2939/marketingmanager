import "server-only";
import { auth } from "@clerk/nextjs/server";
export function authConfigured() {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
}
export function allowedUser(userId: string) {
  return (process.env.STROZPY_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .includes(userId);
}
export async function access() {
  if (!authConfigured())
    return {
      ok: false as const,
      status: 503,
      error: "Authentication has not been configured.",
    };
  const { userId } = await auth();
  if (!userId)
    return { ok: false as const, status: 401, error: "Please sign in." };
  if (!allowedUser(userId))
    return {
      ok: false as const,
      status: 403,
      error: "Your account has not been granted workspace access.",
    };
  return { ok: true as const, userId };
}
