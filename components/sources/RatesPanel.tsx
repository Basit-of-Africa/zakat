"use client";

import { currencySymbol } from "@/lib/currency";

import { useId } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Rates for everything that is not in the home currency.
 *
 * Typed in, for the same reason the gold price is typed in: fetching a number
 * that has to be right today would make it look as though it had been handled
 * for somebody. A student with a dollar account and half a bitcoin looks up
 * two figures, the same way they already look up one.
 *
 * Only the currencies actually present are asked for. A list of every
 * currency in the world would be a worse version of this, and an empty box
 * for a currency nobody holds is a box somebody fills in wrong.
 */
export function RatesPanel({
  currencies,
  base = "NGN",
  rates,
  onChange,
  missing,
}: {
  currencies: readonly string[];
  rates: Readonly<Record<string, string>>;
  onChange: (currency: string, value: string) => void;
  missing: readonly string[];
  base?: string;
}) {
  const id = useId();

  if (currencies.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-ink-soft)]">
        What one unit is worth in {base}, as you look it up now. Nothing is fetched, for the
        same reason the gold price is not: a number that must be right today should not
        look as though somebody else took care of it.
      </p>

      <div className="space-y-2.5">
        {currencies.map((currency) => {
          const fieldId = `${id}-${currency}`;
          const isMissing = missing.includes(currency);
          return (
            <div key={currency}>
              <label htmlFor={fieldId} className="text-sm font-medium">
                1 {currency}
              </label>
              <div
                className={`mt-1.5 flex items-center gap-1.5 rounded-xl border bg-[var(--surface)] px-3 transition-colors focus-within:border-[var(--color-brand)] ${
                  isMissing ? "border-[var(--color-short)]" : "border-[var(--color-rule)]"
                }`}
              >
                <span aria-hidden className="text-sm text-[var(--color-ink-soft)]">
                  {currencySymbol(base)}
                </span>
                <input
                  id={fieldId}
                  value={rates[currency] ?? ""}
                  onChange={(e) => onChange(currency, e.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent py-2.5 text-sm font-mono-nums tabular-nums outline-none"
                />
              </div>
              {isMissing && (
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-short)]">
                  <TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
                  Needed before anything in {currency} can be counted.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
