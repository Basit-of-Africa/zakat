import { randomUUID } from "node:crypto";
import { getStore, json, makeVerifier, newSession, normaliseEmail, tooManyAttempts, validEmail } from "@/lib/server/store";

export async function POST(req: Request) {
  const store = await getStore();
  if (!store) return json({ error: "Accounts are not available on this copy of Zakat Kit." }, 503);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`register:${ip}`, 5)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; authHash?: unknown; kdfSalt?: unknown };
  const email = normaliseEmail(body.email);
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  if (typeof body.authHash !== "string" || !/^[0-9a-f]{64}$/.test(body.authHash)) return json({ error: "Malformed request." }, 400);
  if (typeof body.kdfSalt !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(body.kdfSalt)) return json({ error: "Malformed request." }, 400);

  const id = randomUUID();
  const ok = await store.insert({ id, email, kdfSalt: body.kdfSalt, verifier: await makeVerifier(body.authHash), vault: null, vaultUpdatedAt: null, createdAt: new Date().toISOString() });
  if (!ok) return json({ error: "An account with that email already exists. Sign in instead." }, 409);
  return json({ token: await newSession(store, id), email }, 201);
}
