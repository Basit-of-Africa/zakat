/**
 * A figure the student typed, wearing the same clothes as everything else.
 *
 * Typing a number in is still the primary way this calculator is used, and
 * making it a `FinancialSource` like any other means the totals, the working
 * and the warnings have exactly one code path. The alternative — imported
 * figures in one pipeline and typed ones added on at the end — is how a
 * student ends up seeing a total that does not match the accounts listed
 * above it.
 */

import { money } from "@/lib/money";
import type { AssetCategory, FinancialSource } from "@/lib/sources/types";
import { CATEGORY_LABELS, newSourceId } from "@/lib/sources/types";

export function manualSource(
  category: AssetCategory,
  amount: number,
  currency = "NGN",
  label?: string
): FinancialSource {
  const now = new Date().toISOString();
  return {
    id: newSourceId(`manual-${category}-${label ?? ""}`),
    kind: "manual",
    label: label ?? `${CATEGORY_LABELS[category]} (entered by hand)`,
    balances: [
      {
        category,
        money: money(amount, currency),
        confidence: "stated",
        asOf: now.slice(0, 10),
        note: "Entered by you.",
      },
    ],
    included: true,
    provenance: { origin: "typed", importedAt: now },
    warnings: [],
  };
}

export function manualDebt(amount: number, currency = "NGN"): FinancialSource {
  const now = new Date().toISOString();
  return {
    id: newSourceId("manual-debt"),
    kind: "manual",
    label: "Debts due now (entered by hand)",
    balances: [],
    debtDueNow: money(amount, currency),
    included: true,
    provenance: { origin: "typed", importedAt: now },
    warnings: [],
  };
}
