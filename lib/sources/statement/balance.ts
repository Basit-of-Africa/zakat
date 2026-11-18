/**
 * Turning a parsed statement into something the calculator can add up.
 *
 * The whole job is picking one number — what is in this account — out of a
 * file that might state it, might imply it, or might not contain it at all.
 * The order of preference is the important part, and so is being honest about
 * which one was used:
 *
 * 1. A balance the file states outright. The bank said it; we read it.
 * 2. The running balance on the last row. True only if the rows are in the
 *    order the bank wrote them and the file reaches the end of the period.
 * 3. Nothing. A file of transactions with no balance anywhere cannot tell you
 *    what an account holds, and this says so rather than handing over the net
 *    flow dressed up as a balance. The net flow of a month in which somebody
 *    spent nearly all they earned is close to zero; presenting that as their
 *    wealth would be a catastrophic kind of wrong.
 */

import { money } from "@/lib/money";
import type {
  Confidence,
  FinancialSource,
  ParsedStatement,
  Provenance,
  SourceBalance,
  Transaction,
} from "@/lib/sources/types";
import { maskAccount, newSourceId } from "@/lib/sources/types";

/** Past this many days, a statement is old enough that saying so matters. */
export const STALE_AFTER_DAYS = 45;

export interface Period {
  readonly start?: string;
  readonly end?: string;
}

export function statementPeriod(transactions: readonly Transaction[]): Period {
  const dates = transactions.map((t) => t.date).filter((d): d is string => Boolean(d)).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

export function netFlow(transactions: readonly Transaction[]): number {
  return transactions.reduce((total, t) => total + t.amount, 0);
}

export interface ResolvedBalance {
  readonly amount: number | null;
  readonly confidence: Confidence;
  readonly asOf?: string;
  readonly note: string;
}

export function resolveBalance(parsed: ParsedStatement): ResolvedBalance {
  const period = statementPeriod(parsed.transactions);

  if (parsed.statedBalance !== undefined) {
    return {
      amount: parsed.statedBalance,
      confidence: "stated",
      asOf: parsed.statedBalanceAsOf ?? period.end,
      note: "Closing balance as printed on the statement.",
    };
  }

  const last = lastRunningBalance(parsed.transactions);
  if (last !== null) {
    return {
      amount: last.balance,
      confidence: "estimated",
      asOf: last.date ?? period.end,
      note: "Running balance from the last row of the statement. Correct if the file runs to the end of the period.",
    };
  }

  return {
    amount: null,
    confidence: "derived",
    asOf: period.end,
    note: "This file has no balance in it, only transactions.",
  };
}

/**
 * The running balance on the latest row.
 *
 * Latest by date where dates exist, and by file order where they do not.
 * Sorting by date matters because plenty of banks export newest-first, and
 * taking the final line of those files gives the balance at the start of the
 * period — out by every transaction in it.
 */
function lastRunningBalance(
  transactions: readonly Transaction[]
): { balance: number; date?: string } | null {
  const withBalance = transactions.filter((t) => t.balance !== undefined);
  if (withBalance.length === 0) return null;

  const dated = withBalance.filter((t) => t.date);
  if (dated.length === 0) {
    const last = withBalance[withBalance.length - 1];
    return { balance: last.balance as number };
  }

  // Later date wins; within one date the later row in the file wins, which is
  // the only ordering information a statement gives for same-day rows.
  let best = dated[0];
  let bestIndex = 0;
  dated.forEach((t, index) => {
    if ((t.date as string) >= (best.date as string)) {
      best = t;
      bestIndex = index;
    }
  });
  void bestIndex;

  return { balance: best.balance as number, date: best.date };
}

export function daysSince(iso: string, now: Date): number {
  const then = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(then)) return 0;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

export interface ToSourceOptions {
  readonly provenance: Provenance;
  /** Overrides the account type when the student knows better than the file. */
  readonly category?: "cash" | "savings";
  readonly now?: Date;
}

export function statementToSource(
  parsed: ParsedStatement,
  options: ToSourceOptions
): FinancialSource {
  const now = options.now ?? new Date();
  const period = statementPeriod(parsed.transactions);
  const resolved = resolveBalance(parsed);
  const warnings = [...parsed.warnings];

  const category =
    options.category ?? (parsed.accountType === "savings" ? "savings" : "cash");

  const balances: SourceBalance[] = [];
  let debtDueNow: FinancialSource["debtDueNow"];

  if (resolved.amount === null) {
    warnings.push(
      `${resolved.note} The total of what moved was ${netFlow(parsed.transactions).toLocaleString("en-NG")} ${parsed.currency}, which is not what the account holds. Enter the closing balance yourself.`
    );
  } else if (resolved.amount < 0) {
    // Overdrawn. A minus asset would cancel out savings held elsewhere and
    // quietly reduce the zakat owed, so it goes in as a debt instead and the
    // student decides whether it is genuinely due now.
    debtDueNow = money(Math.abs(resolved.amount), parsed.currency);
    warnings.push(
      "This account is overdrawn. The amount is counted as a debt rather than as a negative balance, and only debts due now should be deducted."
    );
  } else {
    balances.push({
      category,
      money: money(resolved.amount, parsed.currency),
      confidence: resolved.confidence,
      asOf: resolved.asOf,
      note: resolved.note,
    });
  }

  const asOf = resolved.asOf ?? period.end;
  if (asOf) {
    const age = daysSince(asOf, now);
    if (age > STALE_AFTER_DAYS) {
      warnings.push(
        `This figure is ${age} days old. Zakat is worked out on what you hold now, so check it still matches.`
      );
    }
  }

  const institution = parsed.institution ?? options.provenance.fileName ?? "Statement";
  const masked = parsed.accountRef ? maskAccount(parsed.accountRef) : undefined;

  return {
    id: newSourceId(
      `${options.provenance.contentHash ?? ""}${institution}${parsed.accountRef ?? ""}`
    ),
    kind: "statement",
    label: masked ? `${institution} ${masked}` : institution,
    institution: parsed.institution,
    accountRef: masked,
    balances,
    debtDueNow,
    included: true,
    provenance: {
      ...options.provenance,
      format: parsed.format,
      rowCount: parsed.transactions.length,
      periodStart: period.start,
      periodEnd: period.end,
    },
    warnings,
  };
}
