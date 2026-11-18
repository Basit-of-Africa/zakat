import { checkVerifier, getStore, json, newSession, normaliseEmail, tooManyAttempts } from "@/lib/server/store";

export async function POST(req: Request) {
  const store = await getStore();
  if (!store) return json({ error: "Accounts are not available on this copy of Zakat Kit." }, 503);
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; authHash?: unknown };
  const email = normaliseEmail(body.email);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`login:${ip}`) || tooManyAttempts(`login:${email}`)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);

  const user = await store.findByEmail(email);
  const ok = user && typeof body.authHash === "string" && (await checkVerifier(body.authHash, user.verifier));
  if (!user || !ok) return json({ error: "That email and password don't match." }, 401);
  return json({ token: await newSession(store, user.id), email: user.email, vault: user.vault, vaultUpdatedAt: user.vaultUpdatedAt });
}
