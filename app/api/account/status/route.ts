import { getStore, json } from "@/lib/server/store";

/** Whether accounts are on for this copy of Zakat Kit. */
export async function GET() {
  try {
    return json({ enabled: Boolean(await getStore()) });
  } catch {
    return json({ enabled: false, reason: "The account database cannot be reached." }, 503);
  }
}
