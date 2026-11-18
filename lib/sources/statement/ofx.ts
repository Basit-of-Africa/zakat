/**
 * OFX and QFX, which most banks will export if you look for it.
 *
 * Worth supporting ahead of prettier formats because OFX carries a ledger
 * balance as a field, with the date it was true on. That is the one thing a
 * CSV usually lacks and the one thing this calculator most needs: a balance
 * the bank stated rather than one we inferred.
 *
 * OFX 1.x is SGML with optional closing tags, OFX 2.x is real XML. Rather
 * than two parsers, this reads tag/value pairs in document order, which both
 * forms agree on.
 */

import type { ParsedStatement, Transaction } from "@/lib/sources/types";

interface Tag {
  readonly name: string;
  readonly value: string;
  readonly closing: boolean;
}

/** Tag/value pairs in document order; `value` is empty for container tags. */
export function readTags(text: string): Tag[] {
  const tags: Tag[] = [];
  const pattern = /<(\/?)([A-Za-z0-9._]+)[^>]*>([^<]*)/g;
  let match = pattern.exec(text);
  while (match !== null) {
    tags.push({
      name: match[2].toUpperCase(),
      value: match[3].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(),
      closing: match[1] === "/",
    });
    match = pattern.exec(text);
  }
  return tags;
}

/** OFX dates are YYYYMMDD with an optional time and timezone glued on. */
export function ofxDate(raw: string): string | undefined {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  if (+month < 1 || +month > 12 || +day < 1 || +day > 31) return undefined;
  return `${year}-${month}-${day}`;
}

function ofxAmount(raw: string): number | null {
  // OFX is specified as dot-decimal, but exports from European banks do turn
  // up with a comma, and a comma read as a thousands separator turns 1,50
  // into 150.
  const cleaned = raw.trim().replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const ACCOUNT_TYPES: Readonly<Record<string, "current" | "savings" | "other">> = {
  CHECKING: "current",
  SAVINGS: "savings",
  MONEYMRKT: "savings",
  CREDITLINE: "other",
  CD: "savings",
};

export function parseOfx(text: string): ParsedStatement {
  const tags = readTags(text);
  const warnings: string[] = [];

  let currency = "NGN";
  let institution: string | undefined;
  let accountRef: string | undefined;
  let accountType: "current" | "savings" | "other" | undefined;
  let statedBalance: number | undefined;
  let statedBalanceAsOf: string | undefined;
  let availableBalance: number | undefined;

  const transactions: Transaction[] = [];
  let current: { date?: string; description: string; amount: number | null } | null = null;
  // Which balance block we are inside. LEDGERBAL is the real balance;
  // AVAILBAL excludes uncleared items and is read only as a fallback.
  let balanceBlock: "ledger" | "available" | null = null;

  for (const tag of tags) {
    if (tag.closing) {
      if (tag.name === "STMTTRN" && current) {
        if (current.amount !== null) {
          transactions.push({
            date: current.date,
            description: current.description || "(no description)",
            amount: current.amount,
            currency,
          });
        }
        current = null;
      }
      if (tag.name === "LEDGERBAL" || tag.name === "AVAILBAL") balanceBlock = null;
      continue;
    }

    switch (tag.name) {
      case "CURDEF":
        if (tag.value) currency = tag.value.toUpperCase();
        break;
      case "ORG":
      case "FINAME":
        if (tag.value && !institution) institution = tag.value;
        break;
      case "ACCTID":
        if (tag.value && !accountRef) accountRef = tag.value;
        break;
      case "ACCTTYPE":
        accountType = ACCOUNT_TYPES[tag.value.toUpperCase()] ?? "other";
        break;
      case "STMTTRN":
        // A new transaction opening while one is unclosed means the file uses
        // SGML without closing tags; flush the previous one.
        if (current && current.amount !== null) {
          transactions.push({
            date: current.date,
            description: current.description || "(no description)",
            amount: current.amount,
            currency,
          });
        }
        current = { description: "", amount: null };
        break;
      case "DTPOSTED":
      case "DTUSER":
        if (current && !current.date) current.date = ofxDate(tag.value);
        break;
      case "TRNAMT":
        if (current) current.amount = ofxAmount(tag.value);
        break;
      case "NAME":
      case "MEMO":
      case "PAYEE":
        if (current && tag.value) {
          current.description = current.description
            ? `${current.description} ${tag.value}`
            : tag.value;
        }
        break;
      case "LEDGERBAL":
        balanceBlock = "ledger";
        break;
      case "AVAILBAL":
        balanceBlock = "available";
        break;
      case "BALAMT": {
        const amount = ofxAmount(tag.value);
        if (amount === null) break;
        if (balanceBlock === "ledger") statedBalance = amount;
        else if (balanceBlock === "available") availableBalance = amount;
        break;
      }
      case "DTASOF":
        if (balanceBlock === "ledger") statedBalanceAsOf = ofxDate(tag.value);
        break;
      default:
        break;
    }
  }

  if (current && current.amount !== null) {
    transactions.push({
      date: current.date,
      description: current.description || "(no description)",
      amount: current.amount,
      currency,
    });
  }

  if (statedBalance === undefined && availableBalance !== undefined) {
    statedBalance = availableBalance;
    warnings.push(
      "This file carries an available balance but no ledger balance. Available balance leaves out anything not yet cleared, so the real figure may be a little higher."
    );
  }

  if (transactions.length === 0 && statedBalance === undefined) {
    warnings.push("No transactions and no balance were found in this file.");
  }

  return {
    institution,
    accountRef,
    accountType,
    currency,
    transactions,
    statedBalance,
    statedBalanceAsOf,
    format: "ofx",
    warnings,
  };
}
