import type { Metadata } from "next";
import { Mark } from "@/components/Mark";

export const metadata: Metadata = {
  title: "Offline",
};

/**
 * Shown when a page is asked for that was never stored and the network is
 * gone. It says what is true, which is that the calculator itself does not
 * need a connection and the student has simply landed somewhere that was
 * never saved.
 */
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Mark className="size-12" />
      <h1 className="text-lg font-semibold">You are offline</h1>
      <p className="text-sm text-[var(--color-ink-soft)]">
        This page was not saved to your device. The calculator itself does not need a
        connection, so open Zakat Kit from your home screen and carry on.
      </p>
      <a
        href="/"
        className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white"
      >
        Open the calculator
      </a>
    </main>
  );
}
