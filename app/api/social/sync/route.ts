import { guard, reply, syncAccount, unavailable } from "@/lib/social/server";
export const maxDuration = 60;
export async function POST(request: Request) {
  const g = await guard(request, true);
  if (g.error) return g.error;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return reply({ error: "Invalid account." }, 400);
  try {
    const result = await syncAccount(id, g.workspace);
    return reply(result, result.ok ? 200 : 409);
  } catch {
    return unavailable();
  }
}
