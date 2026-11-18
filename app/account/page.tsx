"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cloud, LoaderCircle, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { deleteAccount, logout, readSession, sync, useAccount } from "@/lib/account";
import { useRecords } from "@/lib/records";
import { formatIn } from "@/lib/zakat";

export default function Account() {
  const router = useRouter();
  const account = useAccount();
  const [records, setRecords] = useRecords();
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) router.replace("/signin");
  }, [router, account.email]);

  async function run(label: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(label);
    setSaid(null);
    try {
      await fn();
      if (done) setSaid(done);
    } catch (e) {
      setSaid((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "never");

  return (
    <div className="min-h-dvh bg-[var(--color-wash)]">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">{account.email}</p>
        </div>

        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><Cloud className="size-5" /></span>
              <div>
                <p className="font-semibold">Encrypted backup</p>
                <p className="text-sm text-[var(--color-ink-soft)]">Last saved {when(account.syncedAt)}</p>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => run("sync", sync, "Saved. Your figures are encrypted and stored.")}>
              {busy === "sync" ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Save now
            </button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Your figures are encrypted in this browser with a key made from your password, then stored. Sign in on another device and they come with you. We cannot read them.
          </p>
          {said && <p aria-live="polite" className="mt-3 rounded-xl bg-[var(--color-wash)] p-3 text-sm">{said}</p>}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-semibold">Saved calculations</h2>
          {records.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              None yet. On the <Link href="/calculate" className="font-semibold text-[var(--color-brand)] hover:underline">calculator</Link>, use Save this calculation under your result to keep a record of each year.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-rule)]">
              {records.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {new Date(r.savedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} · net wealth {formatIn(r.netWealth, r.currency ?? "NGN")} · {r.basis} nisab
                    </p>
                  </div>
                  <p className="font-mono-nums font-semibold">{formatIn(r.zakatDue, r.currency ?? "NGN")}</p>
                  <button type="button" aria-label={`Delete ${r.label}`} className="rounded-lg p-2 text-[var(--color-ink-faint)] hover:bg-[var(--color-over-soft)] hover:text-[var(--color-over)]" onClick={() => setRecords(records.filter((x) => x.id !== r.id))}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-semibold">Sign out</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">On a shared computer, remove your figures from this browser as you sign out. They stay in your encrypted backup.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => run("out", async () => { await logout(false); router.push("/"); })}><LogOut className="size-4" /> Sign out</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => run("out", async () => { await sync().catch(() => {}); await logout(true); router.push("/"); })}>Sign out and remove figures from this browser</button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-over)]/30 p-5 sm:p-6">
          <h2 className="font-semibold text-[var(--color-over)]">Delete account</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Deletes the account and its encrypted backup from the server, immediately. Figures in this browser are kept.</p>
          <button
            type="button"
            className="btn btn-sm mt-4 bg-[var(--color-over)] text-white hover:opacity-90"
            onClick={() => {
              if (window.confirm("Delete your account and its backup? This cannot be undone.")) void run("del", async () => { await deleteAccount(); router.push("/"); });
            }}
          >
            <Trash2 className="size-4" /> Delete my account
          </button>
        </section>
      </main>
    </div>
  );
}
