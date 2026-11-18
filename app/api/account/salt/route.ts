import { createHmac, randomBytes } from "node:crypto";
import { getStore, json, normaliseEmail, validEmail } from "@/lib/server/store";

// For unknown emails we answer with a salt that looks real and stays the same
// for that email, so this endpoint cannot be used to find out who has an account.
const SECRET = process.env.ACCOUNT_SECRET || randomBytes(32).toString("hex");

export async function POST(req: Request) {
  const store = await getStore();
  if (!store) return json({ error: "Accounts are not available on this copy of Zakat Kit." }, 503);
  const { email: raw } = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = normaliseEmail(raw);
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  const user = await store.findByEmail(email);
  const salt = user?.kdfSalt ?? createHmac("sha256", SECRET).update(email).digest("base64url").slice(0, 22);
  return json({ salt });
}
