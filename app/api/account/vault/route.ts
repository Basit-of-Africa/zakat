import { json, userFor } from "@/lib/server/store";

/** The encrypted vault: stored and returned, never read. */
export async function GET(req: Request) {
  const who = await userFor(req);
  if (!who) return json({ error: "Sign in again." }, 401);
  return json({ email: who.user.email, vault: who.user.vault, vaultUpdatedAt: who.user.vaultUpdatedAt });
}

export async function PUT(req: Request) {
  const who = await userFor(req);
  if (!who) return json({ error: "Sign in again." }, 401);
  const { vault } = (await req.json().catch(() => ({}))) as { vault?: unknown };
  // Ciphertext only: base64url text, and capped so the vault stays a vault.
  if (typeof vault !== "string" || vault.length > 2_000_000 || !/^[A-Za-z0-9_.-]+$/.test(vault)) return json({ error: "Malformed vault." }, 400);
  const at = new Date().toISOString();
  await who.store.setVault(who.user.id, vault, at);
  return json({ vaultUpdatedAt: at });
}

/** Delete the account and everything stored for it. */
export async function DELETE(req: Request) {
  const who = await userFor(req);
  if (!who) return json({ error: "Sign in again." }, 401);
  await who.store.remove(who.user.id);
  return json({ ok: true });
}
