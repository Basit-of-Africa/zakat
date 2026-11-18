"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#counts", label: "What counts" },
  { href: "/learn", label: "Learn" },
  { href: "/business", label: "For businesses" },
  { href: "/host", label: "Host your own" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-rule)] bg-[var(--color-card)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-[var(--color-ink-soft)] lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-[var(--color-ink)]">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/signin" className="btn btn-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">Sign in</Link>
          <Link href="/calculate" className="btn btn-sm btn-primary">Calculate my zakat</Link>
        </div>
        <button type="button" className="grid size-10 place-items-center rounded-xl lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav aria-label="Main" className="border-t border-[var(--color-rule)] bg-[var(--color-card)] px-4 pb-5 pt-2 lg:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-medium hover:bg-[var(--color-wash)]">{l.label}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/signin" className="btn btn-ghost">Sign in</Link>
            <Link href="/calculate" className="btn btn-primary">Calculate</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
