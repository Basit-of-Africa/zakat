import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/sources/types";
import { findingsCsv, screen, summarise } from "./screen";

const t = (description: string, amount: number): Transaction => ({ description, amount, currency: "NGN", date: "2026-10-01" });

const BOOKS: Transaction[] = [
  t("Sales receipt INV-1042", 450_000),
  t("CREDIT INTEREST OCT", 12_500), // 1: interest received, likely
  t("Overdraft interest charge", -8_000), // 2: interest paid, review
  t("SPORTYBET deposit", -20_000), // 3: gambling stake, likely
  t("BET9JA winnings", 35_000), // 4: gambling winnings, likely
  t("Fleet insurance premium", -60_000), // 5: insurance, review
  t("Staff lunch, Pub & Grill", -15_000), // 6: alcohol, review
  t("Interest-free loan from director", 500_000), // 7: must NOT be read as interest income? see test
  t("Supplier payment: Al-Barakah Foods", -120_000),
];

describe("screening", () => {
  const findings = screen(BOOKS);
  const byIndex = new Map(findings.map((f) => [f.index, f.rule.id]));

  it("flags interest received, gambling both ways, and the review items", () => {
    expect(byIndex.get(1)).toBe("interest-received");
    expect(byIndex.get(2)).toBe("interest-paid");
    expect(byIndex.get(3)).toBe("gambling");
    expect(byIndex.get(4)).toBe("gambling");
    expect(byIndex.get(5)).toBe("conventional-insurance");
    expect(byIndex.get(6)).toBe("alcohol");
  });

  it("leaves ordinary sales and supplier payments alone", () => {
    expect(byIndex.has(0)).toBe(false);
    expect(byIndex.has(8)).toBe(false);
  });

  it("totals only what is likely or confirmed, and never purifies money that went out", () => {
    const s = summarise(BOOKS, findings, {});
    // Interest received + gambling winnings; the interest-free loan is not interest.
    expect(s.toPurify).toBe(12_500 + 35_000);
    expect(s.impermissibleSpending).toBe(20_000);
    expect(s.awaitingReview).toBe(3); // interest paid, insurance, alcohol
  });

  it("respects a person's decisions", () => {
    const s = summarise(BOOKS, findings, { 1: "dismissed", 6: "confirmed" });
    expect(s.toPurify).toBe(35_000);
    expect(s.impermissibleSpending).toBe(20_000 + 15_000);
    expect(s.awaitingReview).toBe(2);
  });

  it("does not mistake an interest-free loan for interest income", () => {
    expect(byIndex.has(7)).toBe(false);
  });

  it("exports the findings with each decision", () => {
    const csv = findingsCsv(findings, { 3: "confirmed" });
    expect(csv.split("\n")[0]).toContain("Your decision");
    expect(csv).toContain('"SPORTYBET deposit",-20000,NGN,"Gambling or betting",likely,confirmed');
  });
});
