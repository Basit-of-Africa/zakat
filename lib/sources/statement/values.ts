/**
 * Reading numbers and dates off a bank statement.
 *
 * This is the least glamorous file in the project and the one most likely to
 * cause a wrong answer, because banks write the same figure a dozen ways and
 * every one of them has to come out as the same number. Real examples from
 * statements this was written against:
 *
 *   1,234.56      12.345,67      (1,234.56)      1234.56DR      -N1,234.56
 *   NGN 1,234.56  1 234,56       1,234.56 Cr     ₦1,234.56
 *
 * Parentheses and a trailing DR both mean negative. A trailing CR is positive
 * and must not be mistaken for a currency. The European form swaps the comma
 * and the dot, which is why the separator is decided by looking at the whole
 * string rather than by stripping commas and hoping.
 */

/** Trailing or leading debit/credit markers, which carry the sign. */
const DEBIT_MARKER = /(^|[\s(])dr\.?($|[\s)])|(^|[\s(])debit($|[\s)])/i;
const CREDIT_MARKER = /(^|[\s(])cr\.?($|[\s)])|(^|[\s(])credit($|[\s)])/i;

/**
 * Parse a money string to a number, or null when there is no number in it.
 *
 * Null rather than zero, always. A cell we could not read and a cell that
 * genuinely says nought must never arrive at the arithmetic looking alike.
 */
export function parseAmount(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text === "" || text === "-" || text === "--") return null;

  const negatedByBrackets = /^\(.*\)$/.test(text);
  const negatedByMarker = DEBIT_MARKER.test(text) && !CREDIT_MARKER.test(text);

  // Keep digits, separators and a leading sign; drop currency symbols, codes,
  // the DR/CR markers and whatever whitespace the export felt like adding.
  const digits = text.replace(/[^\d,.\-+]/g, "");
  if (!/\d/.test(digits)) return null;

  const negatedBySign = /^-/.test(digits) || /-$/.test(digits);
  const body = digits.replace(/[+\-]/g, "");

  const value = parseSeparators(body);
  if (value === null) return null;

  const negative = negatedByBrackets || negatedByMarker || negatedBySign;
  return negative ? -value : value;
}

/**
 * Work out which of `.` and `,` is the decimal point.
 *
 * With both separators present it is settled: the later one is the decimal
 * and the earlier one is grouping, which covers 1,234.56 and 12.345,67 alike.
 *
 * With only one, the character decides. A comma followed by exactly three
 * digits is thousands — comma-decimal locales write currency to two places,
 * so "1,234" is a thousand two hundred and not one-point-two. A lone dot is
 * a decimal point, because reading "123.456" as a hundred and twenty-three
 * thousand would inflate a balance by a factor of a thousand, and a repeated
 * dot is grouping, because "1.234.567" can be nothing else.
 *
 * This is tuned for statements, where figures carry two decimal places. A
 * crypto quantity with three or more is entered as a quantity elsewhere and
 * does not come through here.
 */
function parseSeparators(body: string): number | null {
  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");

  if (lastComma === -1 && lastDot === -1) {
    const n = Number(body);
    return Number.isFinite(n) ? n : null;
  }

  const decimalIndex = decimalPointIndex(body, lastComma, lastDot);

  const cleaned =
    decimalIndex === null
      ? body.replace(/[.,]/g, "")
      : `${body.slice(0, decimalIndex).replace(/[.,]/g, "")}.${body.slice(decimalIndex + 1)}`;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Where the decimal point is, or null when every separator is grouping. */
function decimalPointIndex(
  body: string,
  lastComma: number,
  lastDot: number
): number | null {
  if (lastComma !== -1 && lastDot !== -1) return Math.max(lastComma, lastDot);

  const index = lastComma !== -1 ? lastComma : lastDot;
  const char = lastComma !== -1 ? "," : ".";
  const occurrences = body.split(char).length - 1;
  if (occurrences > 1) return null;

  const tail = body.length - index - 1;
  if (char === "," && tail === 3) return null;
  return index;
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  /** True when the field order was genuinely ambiguous, as in 03/04/2025. */
  readonly ambiguous: boolean;
}

/**
 * Pull the parts out of a date without committing to an order yet.
 *
 * Day-first and month-first cannot be told apart from one row — 03/04/2025 is
 * a real date either way — so the decision is made for the file as a whole by
 * `resolveDateOrder`, which can look for a row where one reading is
 * impossible. Guessing per row would silently reorder a statement.
 */
export function parseDateParts(raw: string | undefined | null): DateParts | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (text === "") return null;

  // ISO, unambiguous, and what every sensible export produces.
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return { year: +iso[1], month: +iso[2], day: +iso[3], ambiguous: false };
  }

  // "12 Jan 2025", "12-Jan-25", "Jan 12, 2025".
  const named = text.match(/^(\d{1,2})[\s\-/]*([a-z]{3,9})[\s\-/]*(\d{2,4})/i);
  if (named && MONTHS[named[2].slice(0, 4).toLowerCase()] !== undefined) {
    const month = MONTHS[named[2].slice(0, 4).toLowerCase()] ?? MONTHS[named[2].slice(0, 3).toLowerCase()];
    return { year: fullYear(+named[3]), month, day: +named[1], ambiguous: false };
  }
  const namedFirst = text.match(/^([a-z]{3,9})[\s\-/]*(\d{1,2})[,\s\-/]+(\d{2,4})/i);
  if (namedFirst) {
    const key = namedFirst[1].slice(0, 4).toLowerCase();
    const month = MONTHS[key] ?? MONTHS[namedFirst[1].slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      return { year: fullYear(+namedFirst[3]), month, day: +namedFirst[2], ambiguous: false };
    }
  }

  // Numeric, order unknown.
  const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (numeric) {
    const a = +numeric[1];
    const b = +numeric[2];
    const year = fullYear(+numeric[3]);
    if (a > 12 && b <= 12) return { year, month: b, day: a, ambiguous: false };
    if (b > 12 && a <= 12) return { year, month: a, day: b, ambiguous: false };
    // Both plausible as a month. Day-first is assumed here only so the shape
    // is complete; `ambiguous` is what the caller should act on.
    return { year, month: b, day: a, ambiguous: true };
  }

  return null;
}

function fullYear(year: number): number {
  if (year >= 1000) return year;
  // A two-digit year on a bank statement is this century. A statement from
  // 1998 is not a thing anybody is calculating zakat from.
  return 2000 + year;
}

export type DateOrder = "day-first" | "month-first";

/**
 * Decide the field order for a whole file from the rows that give it away.
 *
 * One row with a first field above twelve settles it. With no such row the
 * order genuinely cannot be known, and the caller is told so rather than
 * being handed a confident wrong answer.
 */
export function resolveDateOrder(
  rows: readonly (string | undefined)[]
): { order: DateOrder; certain: boolean } {
  for (const row of rows) {
    const text = String(row ?? "").trim();
    const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (!numeric) continue;
    if (+numeric[1] > 12) return { order: "day-first", certain: true };
    if (+numeric[2] > 12) return { order: "month-first", certain: true };
  }
  // Day-first is the default because the statements this is aimed at are
  // Nigerian and British, not American.
  return { order: "day-first", certain: false };
}

/** Apply a resolved order and render ISO, or null if the date is not real. */
export function toIsoDate(parts: DateParts, order: DateOrder): string | null {
  const day = parts.ambiguous && order === "month-first" ? parts.month : parts.day;
  const month = parts.ambiguous && order === "month-first" ? parts.day : parts.month;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(parts.year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(
  raw: string | undefined | null,
  order: DateOrder = "day-first"
): string | null {
  const parts = parseDateParts(raw);
  return parts ? toIsoDate(parts, order) : null;
}
