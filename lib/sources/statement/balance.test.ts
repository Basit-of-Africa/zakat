import { describe, expect, it } from "vitest";
import { resolveBalance, statementToSource, statementPeriod } from "@/lib/sources/statement/balance";
import type { ParsedStatement } from "@/lib/sources/types";

const base = {
  currency: "NGN",
  format: "delimited",
  warnings: [] as string[],
};

const provenance = { origin: "file" as const, importedAt: "2025-03-31T00:00:00.000Z" };

describe("choosing which number is the balance", () => {
  it("prefers a balance the bank stated over one in the rows", () => {
    const parsed: ParsedStatement = {
      ...base,
      statedBalance: 1_402_500,
      transactions: [{ description: "x", amount: 0, currency: "NGN", balance: 999 }],
    };
    const resolved = resolveBalance(parsed);
    expect(resolved.amount).toBe(1_402_500);
    expect(resolved.confidence).toBe("stated");
  });

  it("falls back to the running balance on the latest row", () => {
    const parsed: ParsedStatement = {
      ...base,
      transactions: [
        { date: "2025-03-01", description: "a", amount: 0, currency: "NGN", balance: 1_000_000 },
        { date: "2025-03-17", description: "b", amount: -97_500, currency: "NGN", balance: 1_402_500 },
      ],
    };
    expect(resolveBalance(parsed).amount).toBe(1_402_500);
    expect(resolveBalance(parsed).confidence).toBe("estimated");
  });

  it("takes the latest row by date, not the last row in the file", () => {
    // Newest-first export. Taking the final line would give the balance at
    // the start of the period, out by every transaction in it.
    const parsed: ParsedStatement = {
      ...base,
      transactions: [
        { date: "2025-03-17", description: "b", amount: -97_500, currency: "NGN", balance: 1_402_500 },
        { date: "2025-03-01", description: "a", amount: 0, currency: "NGN", balance: 1_000_000 },
      ],
    };
    expect(resolveBalance(parsed).amount).toBe(1_402_500);
  });

  it("returns no balance at all when the file contains none", () => {
    const parsed: ParsedStatement = {
      ...base,
      transactions: [{ date: "2025-03-04", description: "a", amount: 250_000, currency: "NGN" }],
    };
    expect(resolveBalance(parsed).amount).toBeNull();
  });
});

describe("turning a statement into a source", () => {
  it("never presents a net flow as if it were a balance", () => {
    const parsed: ParsedStatement = {
      ...base,
      transactions: [
        { date: "2025-03-04", description: "in", amount: 250_000, currency: "NGN" },
        { date: "2025-03-20", description: "out", amount: -248_000, currency: "NGN" },
      ],
    };
    const source = statementToSource(parsed, { provenance, now: new Date("2025-03-31") });
    expect(source.balances).toHaveLength(0);
    expect(source.warnings.some((w) => /no balance in it/.test(w))).toBe(true);
  });

  it("counts an overdraft as a debt, not as a negative asset", () => {
    const parsed: ParsedStatement = { ...base, statedBalance: -50_000, transactions: [] };
    const source = statementToSource(parsed, { provenance, now: new Date("2025-03-31") });
    expect(source.balances).toHaveLength(0);
    expect(source.debtDueNow).toEqual({ amount: 50_000, currency: "NGN" });
  });

  it("files a savings account under savings and everything else under cash", () => {
    const savings: ParsedStatement = { ...base, accountType: "savings", statedBalance: 10, transactions: [] };
    const current: ParsedStatement = { ...base, accountType: "current", statedBalance: 10, transactions: [] };
    expect(statementToSource(savings, { provenance }).balances[0].category).toBe("savings");
    expect(statementToSource(current, { provenance }).balances[0].category).toBe("cash");
  });

  it("says how old the figure is once it stops being current", () => {
    const parsed: ParsedStatement = {
      ...base,
      statedBalance: 100,
      statedBalanceAsOf: "2025-01-01",
      transactions: [],
    };
    const source = statementToSource(parsed, { provenance, now: new Date("2025-06-01") });
    expect(source.warnings.some((w) => /days old/.test(w))).toBe(true);
  });

  it("stays quiet about a figure from last week", () => {
    const parsed: ParsedStatement = {
      ...base,
      statedBalance: 100,
      statedBalanceAsOf: "2025-05-28",
      transactions: [],
    };
    const source = statementToSource(parsed, { provenance, now: new Date("2025-06-01") });
    expect(source.warnings.some((w) => /days old/.test(w))).toBe(false);
  });
});

describe("the period a statement covers", () => {
  it("runs from the earliest dated row to the latest", () => {
    expect(
      statementPeriod([
        { date: "2025-03-17", description: "b", amount: 1, currency: "NGN" },
        { date: "2025-03-01", description: "a", amount: 1, currency: "NGN" },
      ])
    ).toEqual({ start: "2025-03-01", end: "2025-03-17" });
  });
});
