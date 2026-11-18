import { describe, expect, it } from "vitest";
import { money } from "@/lib/money";
import { aggregate, currenciesNeeded, groupByCategory, weakestConfidence } from "@/lib/sources/aggregate";
import type { FinancialSource } from "@/lib/sources/types";

function source(partial: Partial<FinancialSource> & { id: string }): FinancialSource {
  return {
    kind: "statement",
    label: partial.id,
    balances: [],
    included: true,
    provenance: { origin: "file", importedAt: "2025-03-31T00:00:00.000Z" },
    warnings: [],
    ...partial,
  };
}

const gtbank = source({
  id: "gtbank",
  label: "GTBank ...6789",
  balances: [{ category: "savings", money: money(1_400_000, "NGN"), confidence: "stated" }],
});

const domiciliary = source({
  id: "dom",
  label: "Access ...4321",
  balances: [{ category: "cash", money: money(500, "USD"), confidence: "stated" }],
});

const wallet = source({
  id: "wallet",
  kind: "wallet",
  label: "Bitcoin wallet",
  balances: [{ category: "cash", money: money(0.01, "BTC"), confidence: "estimated" }],
});

describe("adding up several banks and a wallet", () => {
  const result = aggregate([gtbank, domiciliary, wallet], { USD: 1600, BTC: 95_000_000 });

  it("puts each balance in the bucket the calculator expects", () => {
    expect(result.assets.savings).toBe(1_400_000);
    expect(result.assets.cash).toBe(500 * 1600 + 0.01 * 95_000_000);
  });

  it("is complete when every currency has a rate", () => {
    expect(result.complete).toBe(true);
    expect(result.missingRates).toEqual([]);
  });

  it("keeps the source each figure came from, so the working can be shown", () => {
    expect(result.lines.map((l) => l.sourceLabel)).toEqual([
      "GTBank ...6789",
      "Access ...4321",
      "Bitcoin wallet",
    ]);
  });
});

describe("a currency with no rate", () => {
  const result = aggregate([gtbank, domiciliary], {});

  it("is left out of the total rather than counted as naira", () => {
    expect(result.assets.cash).toBe(0);
    expect(result.assets.savings).toBe(1_400_000);
  });

  it("is not silently dropped: the total is marked incomplete", () => {
    expect(result.complete).toBe(false);
    expect(result.missingRates).toEqual(["USD"]);
    expect(result.unconverted).toHaveLength(1);
  });

  it("warns in words that say the figure is too low", () => {
    expect(result.warnings.some((w) => /too low/.test(w))).toBe(true);
  });
});

describe("excluding a source", () => {
  it("leaves it out of the total but keeps it on the list", () => {
    const result = aggregate([gtbank, { ...domiciliary, included: false }], { USD: 1600 });
    expect(result.assets.cash).toBe(0);
    expect(result.includedSources).toBe(1);
    expect(result.excludedSources).toBe(1);
  });

  it("does not demand a rate for a currency nobody is counting", () => {
    const result = aggregate([gtbank, { ...domiciliary, included: false }], {});
    expect(result.complete).toBe(true);
  });
});

describe("an overdrawn account", () => {
  const overdrawn = source({
    id: "overdrawn",
    label: "Zenith ...1111",
    debtDueNow: money(50_000, "NGN"),
  });

  it("is deducted as a debt rather than netted off the assets", () => {
    const result = aggregate([gtbank, overdrawn], {});
    expect(result.assets.savings).toBe(1_400_000);
    expect(result.immediateDebts).toBe(50_000);
  });

  it("warns, rather than under-deducting silently, when its currency has no rate", () => {
    const foreign = source({ id: "f", label: "Foreign", debtDueNow: money(100, "GBP") });
    const result = aggregate([gtbank, foreign], {});
    expect(result.immediateDebts).toBe(0);
    expect(result.warnings.some((w) => /higher than it should be/.test(w))).toBe(true);
  });
});

describe("knowing what to ask the student for", () => {
  it("lists every currency that is not naira, once each", () => {
    expect(currenciesNeeded([gtbank, domiciliary, wallet])).toEqual(["BTC", "USD"]);
  });
});

describe("how much the total can be trusted", () => {
  it("reports the weakest line, not an average of them", () => {
    const result = aggregate([gtbank, wallet], { BTC: 1 });
    expect(weakestConfidence(result.lines)).toBe("estimated");
  });

  it("reports nothing when there is nothing to report on", () => {
    expect(weakestConfidence([])).toBeNull();
  });
});

describe("grouping the working by category", () => {
  it("shows only the categories that have something in them", () => {
    const groups = groupByCategory(aggregate([gtbank, domiciliary], { USD: 1600 }).lines);
    expect(groups.map((g) => g.category)).toEqual(["cash", "savings"]);
    expect(groups[1].total).toBe(1_400_000);
  });
});
