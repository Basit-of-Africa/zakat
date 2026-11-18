"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { accountsEnabled, login, register } from "@/lib/account";

/**
 * Sign in or create an account. The password never leaves this browser as
 * typed: lib/account.ts turns it into a sign-in hash and a separate vault key
 * before anything is sent.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registering = mode === "register";

  useEffect(() => {
    void accountsEnabled().then(setEnabled);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (registering && password.length < 10) return setError("Use at least 10 characters. A short phrase you will remember works well.");
    setBusy(true);
    setError(null);
    try {
      if (registering) await register(email, password);
      else await login(email, password);
      router.push("/calculate");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (enabled === null) return <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-wash)]" aria-busy="true" />;
  if (!enabled)
    return (
      <div className="rounded-2xl border border-[var(--color-gold)]/40 bg-[var(--color-gold-soft)] p-5">
        <p className="font-semibold">Accounts aren&apos;t open on this copy of Zakat Kit</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">There is no account database behind it, so rather than take your email for nothing: everything works without an account, on this device.</p>
        <Link href="/calculate" className="btn btn-primary mt-4 w-full">Use the calculator</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-[var(--color-rule-strong)] bg-[var(--color-card)] px-3.5 text-base outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/15" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Password</label>
        <input id="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-[var(--color-rule-strong)] bg-[var(--color-card)] px-3.5 text-base outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/15" />
        {registering && <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">At least 10 characters. Length is what makes a password strong.</p>}
      </div>
      {registering && (
        <label className="flex items-start gap-2.5 rounded-xl bg-[var(--color-gold-soft)] p-3 text-sm">
          <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
          <span>I understand that if I forget this password, my saved figures <strong>cannot be recovered</strong>. They are encrypted with it, so nobody else can read them, us included.</span>
        </label>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? <><LoaderCircle className="size-4 animate-spin" /> {registering ? "Creating your account" : "Signing in"}</> : registering ? "Create account" : "Sign in"}
      </button>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--color-over-soft)] p-3 text-sm text-[var(--color-over)]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <p className="text-center text-sm text-[var(--color-ink-soft)]">
        {registering ? "Already have an account? " : "New to Zakat Kit? "}
        <Link href={registering ? "/signin" : "/signup"} className="font-semibold text-[var(--color-brand)] hover:underline">{registering ? "Sign in" : "Create a free account"}</Link>
      </p>
    </form>
  );
}
