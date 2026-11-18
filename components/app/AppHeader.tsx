"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Ankara } from "@/components/Ankara";
import { useAccount } from "@/lib/account";

const NAV = [
  { href: "/calculate", label: "Calculator" },
  { href: "/business", label: "Business" },
  { href: "/learn", label: "Learn" },
];

/** The app's top bar: where you are, help, and whether you are signed in. */
export function AppHeader({ onHelp }: { onHelp?: () => void }) {
  const path = usePathname();
  const account = useAccount();
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-rule)] bg-[var(--color-card)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="App" className="ml-2 hidden gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path === n.href ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${path === n.href ? "bg-[var(--color-wash)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {onHelp && (
            <button type="button" onClick={onHelp} aria-label="Help" className="btn btn-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]">
              <CircleHelp className="size-5" />
              <span className="hidden sm:inline">Help</span>
            </button>
          )}
          {account.email ? (
            <Link href="/account" className="flex items-center gap-2 rounded-xl border border-[var(--color-rule)] py-1 pl-1 pr-3 text-sm" title={`Signed in as ${account.email}`}>
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--color-brand)] text-xs font-semibold uppercase text-white">{account.email[0]}</span>
              <span className="hidden max-w-[10rem] truncate lg:inline">{account.email}</span>
            </Link>
          ) : (
            <>
              <span className="hidden items-center gap-1.5 rounded-xl bg-[var(--color-wash)] px-3 py-2 text-xs font-medium text-[var(--color-ink-soft)] lg:flex" title="Your figures are saved in this browser only">
                <ShieldCheck className="size-4 text-[var(--color-brand)]" /> Saved on this device
              </span>
              <Link href="/signin" className="btn btn-sm btn-ghost">Sign in</Link>
            </>
          )}
        </div>
      </div>
      <Ankara className="h-2 w-full" size={16} />
      <nav aria-label="App" className="flex gap-1 overflow-x-auto border-t border-[var(--color-rule)] px-3 py-1.5 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${path === n.href ? "bg-[var(--color-wash)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
