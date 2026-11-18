"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";

/**
 * The offer to install.
 *
 * Worth making, and worth making quietly. A student working out their zakat
 * on a data bundle gets a real thing from installing: it opens from the home
 * screen, it opens with no signal, and it stops costing them anything to
 * open. So the offer sits at the bottom of the page rather than over it, and
 * once it is dismissed it does not come back.
 *
 * Safari has no install prompt to hook into, so iOS gets the two steps
 * written out instead. Pretending otherwise would leave the larger half of
 * the audience looking for a button that is not there.
 */

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED = "zakat-kit.install-dismissed";

export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (remembersDismissal() || isInstalled()) return;

    function onPrompt(e: Event) {
      // Chrome shows its own bar unless this is cancelled, and its bar
      // appears over the figure somebody is in the middle of reading.
      e.preventDefault();
      setEvent(e as InstallEvent);
      setHidden(false);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setHidden(true));

    // iOS fires nothing at all, so it is asked about directly.
    if (isIosSafari()) {
      setIosHint(true);
      setHidden(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      // Private browsing. Forgetting the dismissal is a small enough cost.
    }
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    setHidden(true);
  }

  if (hidden || (!event && !iosHint)) return null;

  return (
    <aside className="mt-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--color-card)] p-4 shadow-[var(--surface-shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Keep this on your phone</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            Installed, it opens from your home screen and works with no signal. Your
            figures stay on your device either way.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-[var(--color-ink-soft)] hover:bg-[var(--color-brand-soft)]"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      {iosHint ? (
        <ol className="mt-3 space-y-1.5 text-xs text-[var(--color-ink-soft)]">
          <li className="flex items-center gap-2">
            <Share aria-hidden className="size-3.5 shrink-0" />
            Tap Share, at the bottom of Safari.
          </li>
          <li className="flex items-center gap-2">
            <SquarePlus aria-hidden className="size-3.5 shrink-0" />
            Choose Add to Home Screen.
          </li>
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white"
        >
          Install
        </button>
      )}
    </aside>
  );
}

function remembersDismissal(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}

/** Already installed: in a standalone window, or launched from the iOS shelf. */
function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  // Chrome and Firefox on iOS cannot add to the home screen at all, so there
  // is nothing useful to tell somebody using them.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}
