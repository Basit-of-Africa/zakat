/**
 * Noticing that the same account has been imported twice.
 *
 * This is the most likely way a multi-source total goes wrong in practice.
 * A student downloads three months from their bank, gets two of them in one
 * file and one separately, downloads again because they were not sure the
 * first one worked, and ends up with the same balance counted twice. The
 * total looks entirely plausible. Nothing about it invites a second look.
 *
 * Note what this does and does not do. It flags; it never silently drops. An
 * automatic de-duplication that got it wrong would remove a real account — a
 * student genuinely can hold two accounts at one bank with a similar balance
 * — and removing a real account understates zakat. So the student is shown
 * the pair and asked.
 */

import type { FinancialSource } from "@/lib/sources/types";

export type DuplicateReason =
  | "same-file"
  | "same-account-overlapping"
  | "same-account"
  | "same-address"
  | "same-figure";

export interface DuplicateWarning {
  readonly a: string;
  readonly b: string;
  readonly reason: DuplicateReason;
  /** `certain` is worth interrupting for; `possible` is worth mentioning. */
  readonly severity: "certain" | "possible";
  readonly message: string;
}

export function findDuplicates(
  sources: readonly FinancialSource[]
): readonly DuplicateWarning[] {
  const warnings: DuplicateWarning[] = [];
  // Figures typed by hand are never an accidental double-import, and two of
  // them holding the same amount is ordinary — a student with 50,000 in cash
  // and 50,000 in savings should not be interrogated about it.
  const active = sources.filter((s) => s.included && s.kind !== "manual");

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const warning = compare(active[i], active[j]);
      if (warning) warnings.push(warning);
    }
  }

  return warnings;
}

function compare(a: FinancialSource, b: FinancialSource): DuplicateWarning | null {
  const hashA = a.provenance.contentHash;
  const hashB = b.provenance.contentHash;

  if (hashA && hashB && hashA === hashB) {
    return {
      a: a.id,
      b: b.id,
      reason: "same-file",
      severity: "certain",
      message: `"${a.label}" and "${b.label}" are the same file imported twice. Counting both doubles the account.`,
    };
  }

  if (a.provenance.address && a.provenance.address === b.provenance.address) {
    return {
      a: a.id,
      b: b.id,
      reason: "same-address",
      severity: "certain",
      message: `"${a.label}" and "${b.label}" are the same wallet address.`,
    };
  }

  if (a.accountRef && a.accountRef === b.accountRef) {
    const overlapping = periodsOverlap(a, b);
    return {
      a: a.id,
      b: b.id,
      reason: overlapping ? "same-account-overlapping" : "same-account",
      severity: overlapping ? "certain" : "possible",
      message: overlapping
        ? `"${a.label}" and "${b.label}" are the same account over overlapping periods. Keep whichever ends later; a balance is a snapshot, not something to add up.`
        : `"${a.label}" and "${b.label}" look like the same account for different periods. Only the most recent balance counts — an older one is not extra money.`,
    };
  }

  if (sameFigure(a, b)) {
    return {
      a: a.id,
      b: b.id,
      reason: "same-figure",
      severity: "possible",
      message: `"${a.label}" and "${b.label}" hold exactly the same amount in the same currency. That happens, but it is worth checking they are two accounts and not one.`,
    };
  }

  return null;
}

/**
 * Do the two statements cover any of the same days?
 *
 * Missing dates count as not overlapping. A guess in either direction is
 * wrong here, and a false alarm on every undated import would train the
 * student to click past the warning that matters.
 */
export function periodsOverlap(a: FinancialSource, b: FinancialSource): boolean {
  const aStart = a.provenance.periodStart;
  const aEnd = a.provenance.periodEnd;
  const bStart = b.provenance.periodStart;
  const bEnd = b.provenance.periodEnd;
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

function sameFigure(a: FinancialSource, b: FinancialSource): boolean {
  if (a.balances.length !== 1 || b.balances.length !== 1) return false;
  const one = a.balances[0].money;
  const two = b.balances[0].money;
  if (one.amount === 0) return false;
  return one.amount === two.amount && one.currency === two.currency;
}

/**
 * Of a set the student has confirmed are duplicates, which to keep.
 *
 * The one whose figure is true latest, because a balance is a snapshot. Where
 * neither has a date, the one stated by the bank beats one we worked out.
 */
export function preferredOf(
  a: FinancialSource,
  b: FinancialSource
): FinancialSource {
  const aDate = a.balances[0]?.asOf ?? a.provenance.periodEnd;
  const bDate = b.balances[0]?.asOf ?? b.provenance.periodEnd;

  if (aDate && bDate && aDate !== bDate) return aDate > bDate ? a : b;

  const rank = { stated: 3, estimated: 2, derived: 1 } as const;
  const aRank = rank[a.balances[0]?.confidence ?? "derived"];
  const bRank = rank[b.balances[0]?.confidence ?? "derived"];
  return bRank > aRank ? b : a;
}
