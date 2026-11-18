/**
 * Working out what a file is, and handing it to the right parser.
 *
 * Detection is by content rather than by file extension, because the thing a
 * student downloads from their bank and the thing their browser names it are
 * only loosely related. A `.txt` that opens with OFXHEADER is an OFX file;
 * a `.csv` that turns out to be JSON is JSON.
 */

import type { ParsedStatement } from "@/lib/sources/types";
import { parseDelimited, parseTable } from "@/lib/sources/statement/csv";
import { parseOfx } from "@/lib/sources/statement/ofx";
import { parseQif } from "@/lib/sources/statement/qif";

export type StatementFormat = "ofx" | "qif" | "json" | "delimited" | "pdf" | "unknown";

export function detectFormat(text: string, fileName?: string): StatementFormat {
  const head = text.slice(0, 4000);
  const trimmed = head.trimStart();

  if (trimmed.startsWith("%PDF")) return "pdf";
  if (/OFXHEADER|<OFX[\s>]|<STMTTRN>/i.test(head)) return "ofx";
  if (/^!Type:/im.test(head)) return "qif";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(text);
      return "json";
    } catch {
      // A file that opens with a brace but is not valid JSON is more likely a
      // truncated download than a delimited file; fall through and let the
      // delimited parser say it found no table.
    }
  }
  if (/[,;\t|]/.test(head)) return "delimited";
  if (fileName && /\.(csv|tsv|txt)$/i.test(fileName)) return "delimited";
  return "unknown";
}

/**
 * Flatten whatever shape the JSON is into header-and-rows, then read it with
 * the same column mapping the CSV parser uses.
 *
 * Reusing that mapping rather than writing a second one is deliberate: two
 * lists of column synonyms drift apart, and then an export works as CSV and
 * silently fails as JSON for no reason the student can see.
 */
export function jsonToRows(parsed: unknown): readonly string[][] | null {
  const array = findArray(parsed);
  if (!array || array.length === 0) return null;

  const keys: string[] = [];
  for (const entry of array) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
    for (const key of Object.keys(entry as Record<string, unknown>)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  if (keys.length === 0) return null;

  const rows: string[][] = [keys];
  for (const entry of array) {
    const record = entry as Record<string, unknown>;
    rows.push(keys.map((key) => stringify(record[key])));
  }
  return rows;
}

function findArray(value: unknown): readonly unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== "object" || value === null) return null;
  // Exchanges and aggregators wrap the list, usually under one of these.
  for (const key of ["transactions", "data", "items", "results", "rows", "entries"]) {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (Array.isArray(nested) && nested.length > 0 && typeof nested[0] === "object") {
      return nested;
    }
  }
  return null;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  return String(value);
}

export function parseStatement(
  text: string,
  fileName?: string,
  defaultCurrency = "NGN"
): ParsedStatement {
  const format = detectFormat(text, fileName);

  switch (format) {
    case "ofx":
      return parseOfx(text);
    case "qif":
      return parseQif(text, defaultCurrency);
    case "json": {
      const rows = jsonToRows(JSON.parse(text));
      if (!rows) {
        return {
          currency: defaultCurrency,
          transactions: [],
          format: "json",
          warnings: [
            "This JSON file does not contain a list of transactions in a shape this parser recognises.",
          ],
        };
      }
      return { ...parseTable(rows, "json", defaultCurrency), format: "json" };
    }
    case "pdf":
      return {
        currency: defaultCurrency,
        transactions: [],
        format: "pdf",
        warnings: [
          "This is a PDF. Reading one would mean sending it somewhere to be converted, and this app does not send your statement anywhere. Two things that do work: export the same period as CSV or OFX from your bank, or open the PDF, copy the table, and paste it into the box below.",
        ],
      };
    case "delimited":
      return parseDelimited(text, defaultCurrency);
    default:
      return {
        currency: defaultCurrency,
        transactions: [],
        format: "unknown",
        warnings: [
          "This file is not in a format this parser recognises. CSV, OFX, QFX, QIF and JSON exports all work.",
        ],
      };
  }
}
