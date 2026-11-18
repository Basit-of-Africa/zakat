import { describe, expect, it } from "vitest";
import { convert, money } from "./money";
import { aggregate, currenciesNeeded } from "./sources/aggregate";
import { manualSource } from "./sources/manual";
import { guessCurrency } from "./currency";
import { formatIn } from "./zakat";

describe("a home currency other than naira", () => {
  it("leaves amounts already in the home currency alone, and needs a rate for everything else", () => {
    expect(convert(money(500, "GBP"), {}, "GBP")).toEqual({ amount: 500, rate: 1, missingRate: false });
    expect(convert(money(500, "NGN"), {}, "GBP").missingRate).toBe(true);
    expect(convert(money(100, "USD"), { USD: 0.8 }, "GBP").amount).toBe(80);
  });

  it("totals in the home currency, and flags a naira account inside a pound total", () => {
    const sources = [manualSource("cash", 2_000, "GBP"), manualSource("savings", 1_000_000, "NGN")];
    expect(currenciesNeeded(sources, "GBP")).toEqual(["NGN"]);
    const without = aggregate(sources, {}, "GBP");
    expect(without.assets.cash).toBe(2_000);
    expect(without.complete).toBe(false);
    const withRate = aggregate(sources, { NGN: 0.0005 }, "GBP");
    expect(withRate.assets.savings).toBe(500);
    expect(withRate.complete).toBe(true);
  });

  it("guesses a currency from the browser's region", () => {
    expect(guessCurrency(["en-GB", "en"])).toBe("GBP");
    expect(guessCurrency(["en-NG"])).toBe("NGN");
    expect(guessCurrency(["ur-PK"])).toBe("PKR");
    expect(guessCurrency(["en"])).toBe("USD");
  });

  it("formats whole units in any currency", () => {
    expect(formatIn(237_500.4, "NGN")).toContain("237,500");
    expect(formatIn(1234.56, "GBP")).toMatch(/1,235/);
  });
});
