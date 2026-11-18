/**
 * QIF, which Quicken invented in the eighties and some banks still emit.
 *
 * It carries no balance and no currency at all — only a list of amounts — so
 * a QIF import can never state what an account holds, it can only state what
 * moved. That limitation is carried through as a warning rather than papered
 * over, because a net flow presented as a balance would be wrong by the whole
 * of the opening balance.
 */

import type { ParsedStatement, Transaction } from "@/lib/sources/types";
import { parseAmount, parseIsoDate, resolveDateOrder } from "@/lib/sources/statement/values";

export function parseQif(text: string, defaultCurrency = "NGN"): ParsedStatement {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  const rawDates: string[] = [];
  for (const line of lines) {
    if (line.startsWith("D")) rawDates.push(line.slice(1).trim().replace(/'/g, "/"));
  }
  const { order } = resolveDateOrder(rawDates);

  const transactions: Transaction[] = [];
  let record: { date?: string; description: string; amount: number | null } = {
    description: "",
    amount: null,
  };

  const flush = () => {
    if (record.amount !== null) {
      transactions.push({
        date: record.date,
        description: record.description || "(no description)",
        amount: record.amount,
        currency: defaultCurrency,
      });
    }
    record = { description: "", amount: null };
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === "^") {
      flush();
      continue;
    }
    const code = trimmed[0];
    const value = trimmed.slice(1).trim();
    switch (code) {
      case "D":
        // QIF writes the apostrophe as a century marker: 12/01'25.
        record.date = parseIsoDate(value.replace(/'/g, "/"), order) ?? undefined;
        break;
      case "T":
      case "U":
        record.amount = parseAmount(value);
        break;
      case "P":
      case "M":
        record.description = record.description ? `${record.description} ${value}` : value;
        break;
      default:
        break;
    }
  }
  flush();

  return {
    currency: defaultCurrency,
    transactions,
    format: "qif",
    warnings: [
      "QIF files carry no balance and no currency. This import can tell you what moved, not what the account holds, so enter the closing balance yourself.",
    ],
  };
}
