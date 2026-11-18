/**
 * Delimited statement exports: CSV, semicolon CSV, tab-separated.
 *
 * No two banks agree on the shape of this file, so nothing here is hard-coded
 * to a bank. The parser works out the delimiter, finds the header row, maps
 * the columns by name against a list of synonyms, and reads whatever is left.
 * A bank we have never seen usually works, and when it does not the failure
 * is a warning on the import rather than a wrong number in the total.
 *
 * The header is searched for rather than assumed to be line one because most
 * real exports open with a block of account details — name, number, period,
 * closing balance — before the table starts. That block is worth reading too:
 * it is where the only authoritative balance in the file usually lives.
 */

import type { ParsedStatement, Transaction } from "@/lib/sources/types";
import {
  parseAmount,
  parseDateParts,
  resolveDateOrder,
  toIsoDate,
  type DateOrder,
} from "@/lib/sources/statement/values";

const DELIMITERS = [",", ";", "\t", "|"] as const;

type Column =
  | "date"
  | "description"
  | "debit"
  | "credit"
  | "amount"
  | "balance"
  | "currency";

/**
 * Header synonyms, lowercased and stripped of punctuation before matching.
 *
 * Order matters within a list only for readability. Order between lists does
 * not, because a header cell is matched against all of them and the longest
 * match wins — "transaction amount" must not be claimed by "amount" before
 * "balance brought forward" has had a chance at "balance".
 */
const SYNONYMS: Readonly<Record<Column, readonly string[]>> = {
  date: [
    "transaction date", "trans date", "value date", "posting date", "post date",
    "booking date", "date posted", "effective date", "date",
  ],
  description: [
    "description", "narration", "transaction details", "details", "particulars",
    "remarks", "reference", "memo", "payee", "transaction remarks", "narrative",
  ],
  debit: [
    "debit amount", "withdrawal amount", "money out", "paid out", "withdrawals",
    "withdrawal", "outflow", "debit", "dr",
  ],
  credit: [
    "credit amount", "deposit amount", "money in", "paid in", "deposits",
    "deposit", "inflow", "lodgement", "credit", "cr",
  ],
  amount: ["transaction amount", "amount", "value", "transaction value"],
  balance: [
    "running balance", "closing balance", "balance after transaction",
    "available balance", "account balance", "balance",
  ],
  currency: ["currency", "ccy", "curr"],
};

function normaliseHeader(cell: string): string {
  return cell
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split one delimited line, honouring RFC 4180 double quotes. */
export function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * Pick the delimiter by consistency, not by frequency.
 *
 * Counting occurrences picks the comma out of a semicolon file full of
 * "1,234.56". Scoring on how consistent the column count is across lines does
 * not, because the decimal commas fall in different places on every row.
 */
export function sniffDelimiter(lines: readonly string[]): string {
  const sample = lines.filter((l) => l.trim() !== "").slice(0, 20);
  if (sample.length === 0) return ",";

  let best = ",";
  let bestScore = -1;

  for (const delimiter of DELIMITERS) {
    const counts = sample.map((line) => splitRow(line, delimiter).length);
    const maxCount = Math.max(...counts);
    if (maxCount < 2) continue;
    const agreeing = counts.filter((c) => c === maxCount).length;
    const score = agreeing * maxCount;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

interface HeaderMatch {
  readonly index: number;
  readonly columns: Readonly<Partial<Record<Column, number>>>;
  readonly score: number;
}

function matchHeader(cells: readonly string[]): HeaderMatch["columns"] {
  const columns: Partial<Record<Column, number>> = {};
  const claimedBy = new Map<number, { column: Column; length: number }>();

  cells.forEach((cell, index) => {
    const text = normaliseHeader(cell);
    if (text === "") return;

    let bestColumn: Column | null = null;
    let bestLength = 0;

    for (const [column, names] of Object.entries(SYNONYMS) as [Column, readonly string[]][]) {
      for (const name of names) {
        const exact = text === name;
        const contains = text.includes(name);
        if (!exact && !contains) continue;
        // An exact header beats a longer substring match: a column literally
        // called "balance" is a balance even next to one called "balance
        // brought forward".
        const length = exact ? name.length + 100 : name.length;
        if (length > bestLength) {
          bestLength = length;
          bestColumn = column;
        }
      }
    }

    if (!bestColumn) return;
    const existing = columns[bestColumn];
    if (existing === undefined || bestLength > (claimedBy.get(existing)?.length ?? 0)) {
      columns[bestColumn] = index;
      claimedBy.set(index, { column: bestColumn, length: bestLength });
    }
  });

  return columns;
}

function findHeader(rows: readonly string[][]): HeaderMatch | null {
  let best: HeaderMatch | null = null;

  rows.slice(0, 40).forEach((cells, index) => {
    const columns = matchHeader(cells);
    const hasMoney = columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined || columns.balance !== undefined;
    if (!hasMoney) return;
    const score = Object.keys(columns).length;
    if (score >= 2 && (best === null || score > best.score)) {
      best = { index, columns, score };
    }
  });

  return best;
}

/** Labels in the preamble block that carry a balance worth trusting. */
const BALANCE_LABELS = [
  "closing balance",
  "ending balance",
  "balance carried forward",
  "available balance",
  "current balance",
  "closing book balance",
];

interface Preamble {
  readonly institution?: string;
  readonly accountRef?: string;
  readonly accountType?: "current" | "savings" | "other";
  readonly currency?: string;
  readonly statedBalance?: number;
  readonly statedBalanceAsOf?: string;
}

/**
 * Read the block above the table: account number, currency, closing balance.
 *
 * Worth the effort because a stated closing balance is the only figure in the
 * file that does not depend on the export being complete. Every balance we
 * work out ourselves is only as good as the rows we were given.
 */
export function readPreamble(rows: readonly string[][]): Preamble {
  const preamble: {
    institution?: string;
    accountRef?: string;
    accountType?: "current" | "savings" | "other";
    currency?: string;
    statedBalance?: number;
    statedBalanceAsOf?: string;
  } = {};

  for (const cells of rows) {
    const line = cells.join(" ").trim();
    if (line === "") continue;
    const lower = line.toLowerCase();

    for (const label of BALANCE_LABELS) {
      if (!lower.includes(label)) continue;
      // Take the value from the cell after the label when the preamble is
      // itself delimited, and otherwise from the rest of the line.
      const labelCell = cells.findIndex((c) => c.toLowerCase().includes(label));
      const fromNextCell =
        labelCell >= 0
          ? cells.slice(labelCell + 1).find((c) => parseAmount(c) !== null)
          : undefined;
      const candidate = fromNextCell ?? line.slice(lower.indexOf(label) + label.length);
      const amount = parseAmount(candidate);
      if (amount !== null) {
        preamble.statedBalance = amount;
        break;
      }
    }

    const account = lower.match(/account\s*(?:number|no\.?|nuban)?\s*[:#]?\s*([0-9][0-9\s-]{5,})/);
    if (account && !preamble.accountRef) preamble.accountRef = account[1].trim();

    const currency = line.match(/\b(?:currency|ccy)\b\s*[:#]?\s*([A-Za-z]{3})\b/i);
    if (currency && !preamble.currency) preamble.currency = currency[1].toUpperCase();

    if (!preamble.accountType) {
      if (/\bsavings?\b/i.test(line)) preamble.accountType = "savings";
      else if (/\b(current|cheque|checking)\b/i.test(line)) preamble.accountType = "current";
    }

    if (!preamble.institution) {
      const bank = line.match(/([A-Z][A-Za-z.&' ]{2,40}?\s*(?:bank|microfinance|mfb))\b/i);
      if (bank) preamble.institution = bank[1].trim();
    }
  }

  return preamble;
}

/** Currency codes and symbols that might be sitting inside the amount cells. */
const SYMBOLS: Readonly<Record<string, string>> = {
  "₦": "NGN", // naira
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

function sniffCurrency(cells: readonly string[]): string | undefined {
  for (const cell of cells) {
    for (const [symbol, code] of Object.entries(SYMBOLS)) {
      if (cell.includes(symbol)) return code;
    }
    const code = cell.match(/\b(NGN|USD|GBP|EUR|GHS|KES|ZAR|CAD|AED|SAR|USDT|USDC|BTC|ETH)\b/i);
    if (code) return code[1].toUpperCase();
  }
  return undefined;
}

export function parseDelimited(text: string, defaultCurrency = "NGN"): ParsedStatement {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const delimiter = sniffDelimiter(lines);
  const rows = lines.map((line) => splitRow(line, delimiter));
  return parseTable(rows, delimiter === "\t" ? "tab-separated" : "delimited", defaultCurrency);
}

/**
 * The parser proper, over rows that have already been split into cells.
 *
 * Kept separate from the delimiter handling so that a JSON export can be
 * turned into rows and read by exactly the same column mapping, rather than
 * growing a second set of synonyms that drifts from this one.
 */
export function parseTable(
  rows: readonly string[][],
  format: string,
  defaultCurrency = "NGN"
): ParsedStatement {
  const warnings: string[] = [];
  const header = findHeader(rows);
  if (!header) {
    return {
      currency: defaultCurrency,
      transactions: [],
      format,
      warnings: [
        "No transaction table was recognised in this file. It may be a summary rather than a statement, or the column headings may be ones this parser has not seen.",
      ],
    };
  }

  const { columns } = header;
  const preamble = readPreamble(rows.slice(0, header.index));
  const body = rows.slice(header.index + 1).filter((cells) => cells.some((c) => c !== ""));

  const dateCells = columns.date !== undefined ? body.map((cells) => cells[columns.date as number]) : [];
  const { order, certain } = resolveDateOrder(dateCells);
  if (!certain && dateCells.length > 0) {
    warnings.push(
      "Every date in this file could be read either day-first or month-first. Day-first was assumed. It affects which period the statement covers, not the balance."
    );
  }

  const transactions: Transaction[] = [];
  let undated = 0;

  for (const cells of body) {
    const transaction = readRow(cells, columns, order, preamble.currency ?? defaultCurrency);
    if (!transaction) continue;
    if (!transaction.date) undated += 1;
    transactions.push(transaction);
  }

  if (undated > 0) {
    warnings.push(
      `${undated} row${undated === 1 ? "" : "s"} had no readable date. They still count towards the totals; only the period shown may be wrong.`
    );
  }

  const currency =
    preamble.currency ??
    (columns.currency !== undefined
      ? body.map((c) => c[columns.currency as number]).find((c) => /^[A-Za-z]{3}$/.test(c ?? ""))?.toUpperCase()
      : undefined) ??
    sniffCurrency(body.slice(0, 10).flat()) ??
    defaultCurrency;

  if (transactions.length === 0) {
    warnings.push("The table was found but no rows in it could be read as transactions.");
  }

  return {
    institution: preamble.institution,
    accountRef: preamble.accountRef,
    accountType: preamble.accountType,
    currency,
    transactions,
    statedBalance: preamble.statedBalance,
    statedBalanceAsOf: preamble.statedBalanceAsOf,
    format,
    warnings,
  };
}

function readRow(
  cells: readonly string[],
  columns: HeaderMatch["columns"],
  order: DateOrder,
  currency: string
): Transaction | null {
  const at = (column: Column | undefined) =>
    column === undefined || columns[column] === undefined
      ? undefined
      : cells[columns[column] as number];

  const dateParts = parseDateParts(at("date"));
  const date = dateParts ? toIsoDate(dateParts, order) ?? undefined : undefined;
  const description = (at("description") ?? "").trim();
  const balance = parseAmount(at("balance")) ?? undefined;

  const amount = readAmount(at("amount"), at("debit"), at("credit"));
  if (amount === null) {
    // A row with a balance and no movement is usually "balance brought
    // forward". It is not a transaction, but its balance is still useful.
    if (balance !== undefined && description !== "") {
      return { date, description, amount: 0, currency, balance };
    }
    return null;
  }

  const rowCurrency = sniffCurrency([at("currency") ?? "", at("amount") ?? ""]) ?? currency;
  return { date, description, amount, currency: rowCurrency, balance };
}

/**
 * Turn whichever of the money columns exist into one signed amount.
 *
 * Separate debit and credit columns are the common case and the easy one.
 * A single amount column is the trap: some banks sign it, and some print an
 * unsigned figure and expect you to read the word next to it. An unsigned
 * single column is left positive, because inventing a minus sign would turn
 * somebody's salary into a withdrawal.
 */
export function readAmount(
  amountCell: string | undefined,
  debitCell: string | undefined,
  creditCell: string | undefined
): number | null {
  const debit = parseAmount(debitCell);
  const credit = parseAmount(creditCell);

  if (debit !== null && debit !== 0) return -Math.abs(debit);
  if (credit !== null && credit !== 0) return Math.abs(credit);

  const amount = parseAmount(amountCell);
  if (amount !== null) return amount;

  // Both columns present and both zero still means a real, zero-value row.
  if (debit !== null || credit !== null) return 0;
  return null;
}
