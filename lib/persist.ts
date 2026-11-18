"use client";

import { useEffect, useState } from "react";

/**
 * useState that survives a reload, kept in this browser's localStorage and
 * nowhere else. A student who typed six figures off a bank statement and then
 * refreshed used to lose all of them.
 *
 * The first render always uses `initial`, so server and client agree; the
 * saved value arrives in an effect straight after. Storage that is full, off,
 * or in private mode just means nothing is remembered.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  // State, not a ref: nothing may be written until a render has happened with
  // the saved value in it. Writing earlier saved the empty default over the
  // real figures (React's development mode re-runs effects, which made it certain).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Unreadable or absent: keep the default.
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage unavailable: the session still works, it just won't be remembered.
    }
  }, [key, value, ready]);

  return [value, setValue] as const;
}

const PREFIX = "zakat-kit:";

/** Every key this app has saved in this browser, for "Clear my figures". */
export function clearSaved(): void {
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith(PREFIX) && k !== PREFIX + "onboarded" && k !== PREFIX + "account") window.localStorage.removeItem(k);
  } catch {
    // Nothing to clear.
  }
}
