import { json, userFor } from "@/lib/server/store";

export async function POST(req: Request) {
  const who = await userFor(req);
  if (who) await who.store.dropSession(who.tokenHash);
  return json({ ok: true });
}
