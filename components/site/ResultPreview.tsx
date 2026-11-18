"use client";

import { Banknote, Coins, Landmark, ReceiptText } from "lucide-react";
import { useHomeCurrency } from "@/lib/currency";

/**
 * The hero's picture of a result, in the visitor's own currency. The figures
 * are an example, scaled so they are plausible in that currency (an example
 * of 11.5 million makes sense in naira, not in pounds).
 */
const SCALE: Readonly<Record<string, number>> = {
  NGN: 1000, PKR: 250, INR: 80, BDT: 100, IDR: 15000, EGP: 50, TRY: 30, KES: 130, XOF: 600, GHS: 15, ZAR: 18, MAD: 10,
  SAR: 4, AED: 4, QAR: 4, MYR: 4.5, KWD: 0.3, EUR: 1, GBP: 0.8, USD: 1, CAD: 1.4, AUD: 1.5, SGD: 1.35,
};

export function ResultPreview() {
  const { currency, format } = useHomeCurrency();
  const k = SCALE[currency] ?? 1;
  const v = (n: number) => format(n * k);
  const net = 11_500 * k;
  const lines = [
    { icon: <Landmark />, label: "Two bank accounts", value: v(6_850) },
    { icon: <Banknote />, label: "Savings", value: v(3_200) },
    { icon: <Coins />, label: "Gold jewellery, resale value", value: v(2_150) },
    { icon: <ReceiptText />, label: "Less debts due now", value: `− ${v(700)}`, minus: true },
  ];
  return (
    <div className="card-print overflow-hidden text-[var(--color-ink)]" role="img" aria-label={`An example result: zakat due of ${format(net * 0.025)} on net zakatable wealth of ${format(net)}, above the silver threshold.`}>
      <div className="flex items-center justify-between border-b-2 border-[var(--color-ink)] bg-[var(--color-yellow)] px-5 py-3">
        <span className="text-xs font-extrabold">EXAMPLE RESULT · {currency}</span>
        <span className="rounded-sm bg-[var(--color-ink)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-yellow)]">ABOVE NISAB</span>
      </div>
      <div className="p-5 sm:p-6">
        <p className="eyebrow">Zakat due</p>
        <p className="figure-xl mt-2 text-5xl leading-tight sm:text-6xl">{format(net * 0.025)}</p>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">2.5% of {format(net)} net zakatable wealth</p>

        <div className="mt-5">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--color-wash)]">
            <div className="absolute inset-y-0 left-0 w-[88%] rounded-full bg-[var(--color-teal)]" />
            <div className="absolute inset-y-0 left-[22%] w-0.5 bg-[var(--color-ink)]" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-[var(--color-ink-faint)]">
            <span>Silver nisab</span>
            <span>Your net wealth</span>
          </div>
        </div>

        <ul className="mt-5 divide-y-2 divide-[var(--color-rule)] border-y-2 border-[var(--color-rule)]">
          {lines.map((l) => (
            <li key={l.label} className="flex items-center gap-3 px-1 py-2.5 text-sm">
              <span className="text-[var(--color-brand)] [&_svg]:size-4">{l.icon}</span>
              <span className="min-w-0 flex-1 truncate">{l.label}</span>
              <span className={`font-mono-nums ${l.minus ? "text-[var(--color-ink-soft)]" : ""}`}>{l.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
