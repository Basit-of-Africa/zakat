"use client";

import { usePersistentState } from "@/lib/persist";

/** One saved calculation: the figures that matter a year later, not the inputs. */
export interface ZakatRecord {
  id: string;
  savedAt: string;
  label: string;
  zakatDue: number;
  netWealth: number;
  nisabValue: number;
  basis: "gold" | "silver";
  rate: number;
  /** ISO 4217. Older records, made before currencies, are in naira. */
  currency?: string;
}

/** Saved calculations, in this browser (and in the encrypted vault, for account holders). */
export function useRecords() {
  return usePersistentState<ZakatRecord[]>("records", []);
}
