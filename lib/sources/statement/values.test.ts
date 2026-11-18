import { describe, expect, it } from "vitest";
import {
  parseAmount,
  parseIsoDate,
  resolveDateOrder,
} from "@/lib/sources/statement/values";

describe("reading an amount off a statement", () => {
  it("reads the ordinary case", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
  });

  it("reads a figure written the European way round", () => {
    expect(parseAmount("12.345,67")).toBe(12345.67);
  });

  it("reads thousands with no decimal part as thousands, not as a decimal", () => {
    expect(parseAmount("1,234")).toBe(1234);
    expect(parseAmount("1,234,567")).toBe(1234567);
  });

  it("treats brackets as a minus sign, which is what a bank means by them", () => {
    expect(parseAmount("(1,234.56)")).toBe(-1234.56);
  });

  it("treats a trailing DR as money out and CR as money in", () => {
    expect(parseAmount("1234.56 DR")).toBe(-1234.56);
    expect(parseAmount("1234.56 CR")).toBe(1234.56);
  });

  it("ignores a currency symbol stuck to the figure", () => {
    expect(parseAmount("₦1,234.56")).toBe(1234.56);
    expect(parseAmount("NGN 1,234.56")).toBe(1234.56);
    expect(parseAmount("$1,234.56")).toBe(1234.56);
  });

  it("returns null for a cell with no number, never zero", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-")).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
  });

  it("reads a genuine zero as zero", () => {
    expect(parseAmount("0.00")).toBe(0);
  });
});

describe("reading a date off a statement", () => {
  it("reads ISO, which is what a sensible export produces", () => {
    expect(parseIsoDate("2025-03-04")).toBe("2025-03-04");
  });

  it("reads a named month either way round", () => {
    expect(parseIsoDate("12 Jan 2025")).toBe("2025-01-12");
    expect(parseIsoDate("Jan 12, 2025")).toBe("2025-01-12");
    expect(parseIsoDate("12-Sep-25")).toBe("2025-09-12");
  });

  it("settles an ambiguous date by the order it is given", () => {
    expect(parseIsoDate("03/04/2025", "day-first")).toBe("2025-04-03");
    expect(parseIsoDate("03/04/2025", "month-first")).toBe("2025-03-04");
  });

  it("knows 25/12/2025 can only be day-first whatever it is told", () => {
    expect(parseIsoDate("25/12/2025", "month-first")).toBe("2025-12-25");
  });

  it("rejects a date that does not exist", () => {
    expect(parseIsoDate("31/02/2025")).toBeNull();
  });
});

describe("deciding the field order for a whole file", () => {
  it("is certain once one row rules out month-first", () => {
    expect(resolveDateOrder(["03/04/2025", "25/04/2025"])).toEqual({
      order: "day-first",
      certain: true,
    });
  });

  it("is certain the other way when the second field exceeds twelve", () => {
    expect(resolveDateOrder(["04/25/2025"])).toEqual({
      order: "month-first",
      certain: true,
    });
  });

  it("admits it is guessing when every row could be read either way", () => {
    expect(resolveDateOrder(["03/04/2025", "05/06/2025"])).toEqual({
      order: "day-first",
      certain: false,
    });
  });
});
