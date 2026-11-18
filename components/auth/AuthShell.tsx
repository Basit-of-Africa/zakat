import Link from "next/link";
import { ArrowRight, History, KeyRound, LockKeyhole, MonitorSmartphone } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Ankara } from "@/components/Ankara";

/** The frame around sign-in and sign-up: the form, what an account is for, and a way to carry on without one. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden overflow-hidden bg-[var(--color-brand)] p-12 lg:flex lg:flex-col lg:justify-between">
        <Ankara className="absolute inset-0 h-full w-full" />
        <div className="relative w-fit rounded-md bg-white px-3 py-2"><Wordmark /></div>
        <div className="relative rounded-md bg-[var(--color-card)] p-7 shadow-[8px_8px_0_var(--color-yellow)]">
          <p className="max-w-md text-balance text-4xl font-semibold leading-tight tracking-tight">
            Your zakat, on every device. <span className="text-[var(--color-brand)]">Readable only by you.</span>
          </p>
          <ul className="mt-8 space-y-5">
            {[
              [MonitorSmartphone, "On your phone and your laptop", "Sign in anywhere and your figures are there."],
              [LockKeyhole, "Encrypted before it leaves your device", "We store ciphertext. We cannot read your figures, and nor can anyone who breaks in."],
              [History, "A record of every year", "Save each year's calculation and see it next Ramadan."],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof KeyRound;
              return (
                <li key={t as string} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><I className="size-5" /></span>
                  <div>
                    <p className="font-semibold">{t as string}</p>
                    <p className="text-sm text-[var(--color-ink-soft)]">{b as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative w-fit rounded-md bg-white px-3 py-1.5 text-sm font-semibold">Free and open source. No ads, no tracking.</p>
      </aside>
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark className="lg:invisible" />
          <Link href="/" className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">Back to home</Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-rule-strong)] p-4">
            <p className="text-sm font-semibold">Rather not make an account?</p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">The calculator works fully without one, and keeps your figures in this browser.</p>
            <Link href="/calculate" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand)] hover:underline">
              Continue without an account <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
