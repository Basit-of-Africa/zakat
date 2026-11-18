"use client";

import { usePersistentState } from "@/lib/persist";
import { useEffect } from "react";

/**
 * The person's home currency: what every total, threshold and zakat figure is
 * reported in. Picked from the browser's region on a first visit and changeable
 * at any time. Nothing is converted behind anyone's back: amounts held in other
 * currencies still need a rate the person enters (lib/money.ts).
 */
export interface CurrencyOption {
  readonly code: string;
  readonly name: string;
}

/** The currencies offered first; any ISO 4217 code works. */
export const CURRENCIES: readonly CurrencyOption[] = [
  { code: "NGN", name: "Nigerian naira" },
  { code: "USD", name: "US dollar" },
  { code: "GBP", name: "British pound" },
  { code: "EUR", name: "Euro" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "PKR", name: "Pakistani rupee" },
  { code: "INR", name: "Indian rupee" },
  { code: "BDT", name: "Bangladeshi taka" },
  { code: "IDR", name: "Indonesian rupiah" },
  { code: "MYR", name: "Malaysian ringgit" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "SAR", name: "Saudi riyal" },
  { code: "AED", name: "UAE dirham" },
  { code: "QAR", name: "Qatari riyal" },
  { code: "KWD", name: "Kuwaiti dinar" },
  { code: "EGP", name: "Egyptian pound" },
  { code: "MAD", name: "Moroccan dirham" },
  { code: "TRY", name: "Turkish lira" },
  { code: "KES", name: "Kenyan shilling" },
  { code: "GHS", name: "Ghanaian cedi" },
  { code: "ZAR", name: "South African rand" },
  { code: "XOF", name: "West African CFA franc" },
];

const BY_REGION: Readonly<Record<string, string>> = {
  NG: "NGN", US: "USD", GB: "GBP", IE: "EUR", FR: "EUR", DE: "EUR", NL: "EUR", BE: "EUR", ES: "EUR", IT: "EUR", AT: "EUR",
  CA: "CAD", AU: "AUD", PK: "PKR", IN: "INR", BD: "BDT", ID: "IDR", MY: "MYR", SG: "SGD", SA: "SAR", AE: "AED",
  QA: "QAR", KW: "KWD", EG: "EGP", MA: "MAD", TR: "TRY", KE: "KES", GH: "GHS", ZA: "ZAR", SN: "XOF", CI: "XOF", ML: "XOF", NE: "XOF", BF: "XOF",
};

/** A sensible first guess from the browser's languages, e.g. en-GB gives GBP. USD when there is no clue. */
export function guessCurrency(languages: readonly string[]): string {
  for (const tag of languages) {
    const region = tag.split("-")[1]?.toUpperCase();
    if (region && BY_REGION[region]) return BY_REGION[region];
  }
  return "USD";
}

/** Whole units: nobody pays zakat in kobo or cents, and the extra digits make a figure harder to read aloud. */
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(amount));
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

/** The symbol to put in front of an input, e.g. "₦", "£", "Rs". */
export function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency");
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

/** The home currency, remembered in this browser; guessed from its region the first time. */
export function useHomeCurrency() {
  const [code, setCode] = usePersistentState<string>("settings:currency", "");
  useEffect(() => {
    if (code) return;
    const t = setTimeout(() => {
      try {
        if (!window.localStorage.getItem("zakat-kit:settings:currency")) setCode(guessCurrency(navigator.languages ?? [navigator.language]));
      } catch {
        setCode("USD");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [code, setCode]);
  const resolved = code || "NGN";
  return { currency: resolved, setCurrency: setCode, symbol: currencySymbol(resolved), format: (n: number) => formatAmount(n, resolved) };
}
