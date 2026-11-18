/**
 * The service worker.
 *
 * It exists so the app opens on a phone with no signal, and so a student on a
 * metered bundle does not pay to download the same page twice. It is written
 * by hand rather than generated because the one rule that matters here is
 * easier to keep honest in forty lines than in a plugin's config:
 *
 *   NOTHING FROM /api IS EVER CACHED OR SERVED FROM CACHE.
 *
 * The only thing under /api is the bank connection exchange, whose response
 * is somebody's account balance. A cached copy of that would sit in the
 * browser's storage after the tab closed, survive the student handing their
 * phone to someone, and outlive the "we keep nothing" the app tells them.
 * Statements are never involved: those are parsed in the page and never
 * become requests at all.
 */

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

/**
 * Fetched on install, so a first visit on good wifi is enough to make the app
 * work on no wifi at all. Kept short on purpose: Next hashes its assets and
 * the runtime cache picks those up as they are used.
 */
const PRECACHE = ["/", "/offline", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // One failure should not fail the whole install, so each is added on
      // its own: an icon that 404s must not cost the student the offline page.
      await Promise.allSettled(PRECACHE.map((path) => cache.add(path)));
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, RUNTIME]);
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

/**
 * The page asks for this when the student presses Reload on the update
 * notice. It is never called on its own: taking over while somebody has half
 * a dozen statements imported would throw their work away to save them a tap.
 */
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Somebody else's server, somebody else's rules.
  if (url.origin !== self.location.origin) return;

  // The line this whole file is written around.
  if (url.pathname.startsWith("/api/")) return;

  // A page: try the network so the figures and the wording are current, fall
  // back to whatever is stored, and fall back again to a page that explains
  // itself rather than the browser's dinosaur.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL);
          // Handed to waitUntil rather than left floating: the browser is
          // free to stop this worker the moment it has answered, and a write
          // nobody is waiting on is a write that may never land.
          event.waitUntil(cache.put(request, fresh.clone()));
          return fresh;
        } catch {
          return (
            (await caches.match(request)) ??
            (await caches.match("/offline")) ??
            new Response("You are offline.", {
              status: 503,
              headers: { "content-type": "text/plain" },
            })
          );
        }
      })()
    );
    return;
  }

  // Build output is content-hashed, so a hit is always the right file and
  // there is no reason to ask the network about it again.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        const fresh = await fetch(request);
        const cache = await caches.open(RUNTIME);
        // Awaited, unlike the others: these are requested in bursts as a page
        // loads, and a write still in flight means the next one goes to the
        // network for a file already in hand.
        await cache.put(request, fresh.clone());
        return fresh;
      })()
    );
    return;
  }

  // Everything else same-origin: serve what is stored and refresh it behind
  // the student's back, so the second visit is instant and the third is current.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(request);
      const network = fetch(request)
        .then(async (response) => {
          if (response.ok) await cache.put(request, response.clone());
          return response;
        })
        .catch(() => undefined);

      if (hit) {
        event.waitUntil(network);
        return hit;
      }
      return (await network) ?? new Response("", { status: 504 });
    })()
  );
});
