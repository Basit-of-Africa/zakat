import { describe, expect, it } from "vitest";
import { money } from "@/lib/money";
import { findDuplicates, periodsOverlap, preferredOf } from "@/lib/sources/duplicates";
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

describe("the same file imported twice", () => {
  it("is caught by its contents, not by its name", () => {
    const a = source({
      id: "a",
      label: "statement.csv",
      provenance: { origin: "file", importedAt: "", contentHash: "abc123" },
    });
    const b = source({
      id: "b",
      label: "statement (1).csv",
      provenance: { origin: "file", importedAt: "", contentHash: "abc123" },
    });
    const [warning] = findDuplicates([a, b]);
    expect(warning.reason).toBe("same-file");
    expect(warning.severity).toBe("certain");
  });
});

describe("the same account imported twice", () => {
  const march = source({
    id: "march",
    accountRef: "...6789",
    provenance: { origin: "file", importedAt: "", periodStart: "2025-03-01", periodEnd: "2025-03-31" },
  });

  it("is certain when the periods overlap", () => {
    const overlapping = source({
      id: "overlap",
      accountRef: "...6789",
      provenance: { origin: "file", importedAt: "", periodStart: "2025-03-15", periodEnd: "2025-04-15" },
    });
    const [warning] = findDuplicates([march, overlapping]);
    expect(warning.severity).toBe("certain");
    expect(warning.message).toMatch(/snapshot/);
  });

  it("is still worth saying when the periods do not overlap", () => {
    const april = source({
      id: "april",
      accountRef: "...6789",
      provenance: { origin: "file", importedAt: "", periodStart: "2025-04-01", periodEnd: "2025-04-30" },
    });
    const [warning] = findDuplicates([march, april]);
    expect(warning.severity).toBe("possible");
    expect(warning.message).toMatch(/not extra money/);
  });
});

describe("two different accounts", () => {
  it("are left alone", () => {
    const a = source({ id: "a", accountRef: "...1111", balances: [{ category: "cash", money: money(100, "NGN"), confidence: "stated" }] });
    const b = source({ id: "b", accountRef: "...2222", balances: [{ category: "cash", money: money(200, "NGN"), confidence: "stated" }] });
    expect(findDuplicates([a, b])).toEqual([]);
  });

  it("are flagged only as possible when they hold exactly the same amount", () => {
    const a = source({ id: "a", accountRef: "...1111", balances: [{ category: "cash", money: money(100, "NGN"), confidence: "stated" }] });
    const b = source({ id: "b", accountRef: "...2222", balances: [{ category: "cash", money: money(100, "NGN"), confidence: "stated" }] });
    expect(findDuplicates([a, b])[0].severity).toBe("possible");
  });
});

describe("a wallet added twice", () => {
  it("is caught by the address", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const a = source({ id: "a", kind: "wallet", provenance: { origin: "wallet", importedAt: "", address } });
    const b = source({ id: "b", kind: "wallet", provenance: { origin: "connector", importedAt: "", address } });
    expect(findDuplicates([a, b])[0].reason).toBe("same-address");
  });
});

describe("an excluded source", () => {
  it("is not compared against anything, because it is not in the total", () => {
    const a = source({ id: "a", provenance: { origin: "file", importedAt: "", contentHash: "x" } });
    const b = source({ id: "b", included: false, provenance: { origin: "file", importedAt: "", contentHash: "x" } });
    expect(findDuplicates([a, b])).toEqual([]);
  });
});

describe("periods", () => {
  it("do not overlap when either one is undated", () => {
    const dated = source({ id: "a", provenance: { origin: "file", importedAt: "", periodStart: "2025-03-01", periodEnd: "2025-03-31" } });
    const undated = source({ id: "b" });
    expect(periodsOverlap(dated, undated)).toBe(false);
  });
});

describe("choosing which of a duplicate pair to keep", () => {
  it("keeps the one whose figure is true later", () => {
    const older = source({
      id: "older",
      balances: [{ category: "cash", money: money(1, "NGN"), confidence: "stated", asOf: "2025-03-31" }],
    });
    const newer = source({
      id: "newer",
      balances: [{ category: "cash", money: money(1, "NGN"), confidence: "estimated", asOf: "2025-04-30" }],
    });
    expect(preferredOf(older, newer).id).toBe("newer");
  });

  it("prefers a stated balance when neither carries a date", () => {
    const stated = source({ id: "stated", balances: [{ category: "cash", money: money(1, "NGN"), confidence: "stated" }] });
    const guessed = source({ id: "guessed", balances: [{ category: "cash", money: money(1, "NGN"), confidence: "estimated" }] });
    expect(preferredOf(guessed, stated).id).toBe("stated");
  });
});
