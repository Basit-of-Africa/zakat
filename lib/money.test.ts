import { describe, expect, it } from "vitest";
import { convert, formatMoney, missingRatesFor, money } from "@/lib/money";

describe("converting to naira", () => {
  it("leaves naira alone without needing a rate", () => {
    expect(convert(money(1000, "NGN"), {})).toEqual({
      amount: 1000,
      rate: 1,
      missingRate: false,
    });
  });

  it("multiplies by the rate the student entered", () => {
    expect(convert(money(50, "USD"), { USD: 1600 }).amount).toBe(80_000);
  });

  it("values half a bitcoin the same way it values fifty dollars", () => {
    expect(convert(money(0.5, "BTC"), { BTC: 95_000_000 }).amount).toBe(47_500_000);
  });

  it("refuses to convert a currency with no rate rather than dropping it", () => {
    const result = convert(money(50, "GBP"), { USD: 1600 });
    expect(result.amount).toBeNull();
    expect(result.missingRate).toBe(true);
  });

  it("treats a rate of zero as no rate, not as worthless", () => {
    const result = convert(money(50, "USD"), { USD: 0 });
    expect(result.amount).toBeNull();
    expect(result.missingRate).toBe(true);
  });

  it("is case-insensitive about the ticker, because people type usd", () => {
    expect(convert(money(1, "usd"), { USD: 1600 }).amount).toBe(1600);
  });
});

describe("reporting what cannot be converted", () => {
  it("names each missing currency once, sorted", () => {
    const values = [money(1, "USD"), money(2, "GBP"), money(3, "USD"), money(4, "NGN")];
    expect(missingRatesFor(values, {})).toEqual(["GBP", "USD"]);
  });

  it("says nothing about a zero holding, which cannot be understated", () => {
    expect(missingRatesFor([money(0, "USD")], {})).toEqual([]);
  });
});

describe("formatting", () => {
  it("shows naira without decimals and crypto with enough of them", () => {
    expect(formatMoney(money(1234.56, "NGN"))).toBe("1,235 NGN");
    expect(formatMoney(money(0.00051234, "BTC"))).toBe("0.00051234 BTC");
  });
});
