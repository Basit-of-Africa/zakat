/**
 * The one server route in this project.
 *
 * Open banking requires a secret key, and a secret key in a browser is not a
 * secret, so the code-for-account exchange has to happen here. Read
 * `lib/sources/connect/bank.ts` for why this exists at all and what the rest
 * of the app does instead.
 *
 * Two rules this route keeps:
 *
 * It is off unless deliberately configured. With no `MONO_SECRET_KEY` set it
 * returns 501 and says so, rather than failing in a way that looks like a
 * bug. Nobody deploying this app gets bank connections by accident.
 *
 * It stores nothing. The account id the aggregator returns is used once, in
 * this request, and is not written anywhere. There is no database in this
 * project and this route is not the reason to add one.
 */

const SECRET_KEY = process.env.MONO_SECRET_KEY ?? "";
const API_BASE = process.env.MONO_API_BASE ?? "https://api.withmono.com";

export async function POST(request: Request): Promise<Response> {
  if (!SECRET_KEY) {
    return new Response(
      "Bank connections are not configured on this deployment. Upload a statement instead.",
      { status: 501 }
    );
  }

  let code: unknown;
  try {
    ({ code } = (await request.json()) as { code?: unknown });
  } catch {
    return new Response("Expected a JSON body.", { status: 400 });
  }

  if (typeof code !== "string" || code.trim() === "") {
    return new Response("Expected a connection code.", { status: 400 });
  }

  const headers = { "content-type": "application/json", "mono-sec-key": SECRET_KEY };

  const auth = await fetch(`${API_BASE}/v2/accounts/auth`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });

  if (!auth.ok) {
    // The provider's error text can contain the key or the code, so it is
    // deliberately not passed through to the browser.
    return new Response("The bank connection could not be authorised.", { status: 502 });
  }

  const authBody = (await auth.json()) as { id?: string; data?: { id?: string } };
  const accountId = authBody.id ?? authBody.data?.id;
  if (!accountId) {
    return new Response("The provider did not return an account.", { status: 502 });
  }

  const account = await fetch(`${API_BASE}/v2/accounts/${accountId}`, { headers });
  if (!account.ok) {
    return new Response("The account could not be read.", { status: 502 });
  }

  return new Response(await account.text(), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // Nothing here should ever sit in a cache: it is one person's balance.
      "cache-control": "no-store",
    },
  });
}
