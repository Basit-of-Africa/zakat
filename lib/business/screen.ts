/**
 * Screening a business's transactions for income that needs purifying and
 * spending that needs a second look.
 *
 * This is keyword matching on transaction descriptions, and it says so
 * everywhere it is shown. It cannot know what a payment was for, only what the
 * bank printed. So it sorts its findings into two kinds:
 *
 *   likely  the description names the thing outright ("interest credit",
 *           a betting platform). These are counted in the totals.
 *   review  it might be, and a person should look ("insurance premium", "bar").
 *           Shown, never counted, until someone confirms it.
 *
 * Nothing here is a ruling. The common view is that interest (riba) received
 * should be given away to charity, without hope of reward and not as zakat;
 * how, and whether a given item is impermissible, is for the business's scholar.
 */
import type { Transaction } from "@/lib/sources/types";

export type Confidence = "likely" | "review";
export type Direction = "in" | "out" | "both";

export interface Rule {
  readonly id: string;
  readonly label: string;
  /** Which way the money moves for this to apply. */
  readonly direction: Direction;
  readonly confidence: Confidence;
  readonly pattern: RegExp;
  /** Wording that rules a match out, e.g. "interest-free". */
  readonly unless?: RegExp;
  /** What to do about it, in a sentence. */
  readonly advice: string;
}

export const RULES: readonly Rule[] = [
  {
    id: "interest-received",
    label: "Interest received",
    direction: "in",
    confidence: "likely",
    pattern: /\b(credit interest|interest (credit|paid|earned|income|cr)|int\.?\s*(cr|credit|paid)|savings interest|interest on (deposit|savings|balance)|accrued interest|interest)\b/i,
    unless: /\b(interest[- ]free|no[- ]interest|zero[- ]interest|0\s*%\s*interest|without interest)\b/i,
    advice: "Interest (riba) received. The common view is to give it away to charity, not as zakat and not expecting reward.",
  },
  {
    id: "interest-paid",
    label: "Interest paid",
    direction: "out",
    confidence: "review",
    pattern: /\b(loan interest|overdraft interest|interest (charge|debit|dr|on loan|on overdraft)|int\.?\s*(dr|debit|charge)|late payment interest|interest)\b/i,
    unless: /\b(interest[- ]free|no[- ]interest|zero[- ]interest|0\s*%\s*interest|without interest)\b/i,
    advice: "Interest paid on borrowing. Not something to purify, but worth moving to non-interest finance where you can.",
  },
  {
    id: "gambling",
    label: "Gambling or betting",
    direction: "both",
    confidence: "likely",
    pattern: /\b(bet9ja|betking|sportybet|betway|nairabet|merrybet|1xbet|bet365|betnaija|msport|lottery|lotto|casino|bingo|sports ?bet(ting)?|betting)\b/i,
    advice: "Gambling (maysir). Winnings received are given away; stakes paid are a loss to stop.",
  },
  {
    id: "alcohol",
    label: "Alcohol",
    direction: "both",
    confidence: "review",
    pattern: /\b(liquor|brewery|breweries|winery|wine shop|beer|spirits|lounge ?bar|pub)\b/i,
    advice: "Possibly alcohol. Check what the payment was for: many venues sell other things too.",
  },
  {
    id: "conventional-insurance",
    label: "Conventional insurance",
    direction: "out",
    confidence: "review",
    pattern: /\b(insurance premium|premium (payment|debit)|assurance|insurance)\b/i,
    advice: "Scholars differ on conventional insurance; many prefer takaful. Some insurance is required by law, which changes the question.",
  },
];

export interface Finding {
  readonly index: number;
  readonly transaction: Transaction;
  readonly rule: Rule;
}

const applies = (rule: Rule, amount: number) =>
  rule.direction === "both" || (rule.direction === "in" ? amount > 0 : amount < 0);

/** The first rule that matches each transaction, in rule order. One finding per transaction at most. */
export function screen(transactions: readonly Transaction[]): Finding[] {
  const out: Finding[] = [];
  transactions.forEach((t, index) => {
    const rule = RULES.find((r) => applies(r, t.amount) && r.pattern.test(t.description) && !r.unless?.test(t.description));
    if (rule) out.push({ index, transaction: t, rule });
  });
  return out;
}

export type Verdict = "confirmed" | "dismissed" | undefined;

export interface AuditSummary {
  readonly scanned: number;
  readonly flagged: number;
  /** Income to give away: likely (or confirmed) findings with money coming in. */
  readonly toPurify: number;
  /** Spending on likely (or confirmed) items. */
  readonly impermissibleSpending: number;
  /** Findings still waiting for a person to look at them. */
  readonly awaitingReview: number;
}

/**
 * Totals, respecting what a person has decided: a dismissed finding counts for
 * nothing; a confirmed "review" finding counts like a likely one; an
 * undecided "review" finding counts only towards awaitingReview.
 */
export function summarise(transactions: readonly Transaction[], findings: readonly Finding[], verdicts: Readonly<Record<number, Verdict>>): AuditSummary {
  let toPurify = 0;
  let impermissibleSpending = 0;
  let awaitingReview = 0;
  let flagged = 0;
  for (const f of findings) {
    const v = verdicts[f.index];
    if (v === "dismissed") continue;
    flagged++;
    const counts = v === "confirmed" || f.rule.confidence === "likely";
    if (!counts) {
      awaitingReview++;
      continue;
    }
    // Interest paid is flagged for review but never "purified": you cannot give away money that left.
    if (f.transaction.amount > 0) toPurify += f.transaction.amount;
    else if (f.rule.id !== "interest-paid") impermissibleSpending += -f.transaction.amount;
  }
  return { scanned: transactions.length, flagged, toPurify, impermissibleSpending, awaitingReview };
}

/** The findings as CSV, for the business's records or its scholar. */
export function findingsCsv(findings: readonly Finding[], verdicts: Readonly<Record<number, Verdict>>): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [["Date", "Description", "Amount", "Currency", "Flag", "Confidence", "Your decision"].join(",")];
  for (const f of findings) {
    const t = f.transaction;
    rows.push([t.date ?? "", q(t.description), String(t.amount), t.currency, q(f.rule.label), f.rule.confidence, verdicts[f.index] ?? "undecided"].join(","));
  }
  return rows.join("\n");
}
