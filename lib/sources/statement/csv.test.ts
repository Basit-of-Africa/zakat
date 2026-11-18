import { describe, expect, it } from "vitest";
import { parseDelimited, readAmount, sniffDelimiter, splitRow } from "@/lib/sources/statement/csv";

/** A Nigerian bank export: preamble block, then separate debit and credit. */
const WITH_PREAMBLE = `Account Statement
Account Name,ABDULLAHI MUSA
Account Number,0123456789
Account Type,Savings Account
Currency,NGN
Closing Balance,"1,402,500.00"

Transaction Date,Narration,Debit,Credit,Balance
01/03/2025,OPENING BALANCE,,,"1,000,000.00"
04/03/2025,TRF FROM FATHER,,"500,000.00","1,500,000.00"
17/03/2025,POS PURCHASE SHOPRITE,"97,500.00",,"1,402,500.00"
`;

describe("a statement with a block of account details above the table", () => {
  const parsed = parseDelimited(WITH_PREAMBLE);

  it("prefers the closing balance the bank printed over anything it works out", () => {
    expect(parsed.statedBalance).toBe(1_402_500);
  });

  it("reads the account number and currency out of the preamble", () => {
    expect(parsed.accountRef).toBe("0123456789");
    expect(parsed.currency).toBe("NGN");
    expect(parsed.accountType).toBe("savings");
  });

  it("reads debits as money out and credits as money in", () => {
    const amounts = parsed.transactions.map((t) => t.amount);
    expect(amounts).toEqual([0, 500_000, -97_500]);
  });

  it("dates the rows day-first, because one row rules out the alternative", () => {
    expect(parsed.transactions[2].date).toBe("2025-03-17");
  });
});

describe("a semicolon export with comma decimals", () => {
  const parsed = parseDelimited(
    [
      "Date;Description;Amount;Balance",
      "04.03.2025;Salary;1.250,00;3.400,50",
      "17.03.2025;Rent;-800,00;2.600,50",
    ].join("\n")
  );

  it("picks the semicolon rather than the decimal commas", () => {
    expect(parsed.transactions).toHaveLength(2);
  });

  it("reads the amounts the European way round", () => {
    expect(parsed.transactions[0].amount).toBe(1250);
    expect(parsed.transactions[1].amount).toBe(-800);
  });

  it("reads the running balance", () => {
    expect(parsed.transactions[1].balance).toBe(2600.5);
  });
});

describe("a statement exported newest first", () => {
  const parsed = parseDelimited(
    [
      "Date,Description,Amount,Running Balance",
      "2025-03-17,POS PURCHASE,-97500.00,1402500.00",
      "2025-03-04,TRANSFER IN,500000.00,1500000.00",
      "2025-03-01,OPENING,0.00,1000000.00",
    ].join("\n")
  );

  it("keeps the dates so the latest row can be found later", () => {
    expect(parsed.transactions[0].date).toBe("2025-03-17");
    expect(parsed.transactions[2].date).toBe("2025-03-01");
  });
});

describe("a statement with one signed amount column and no balance", () => {
  const parsed = parseDelimited(
    ["Date,Details,Amount", "2025-03-04,SALARY,250000", "2025-03-09,DATA BUNDLE,-5000"].join("\n")
  );

  it("reads the sign the bank gave rather than inventing one", () => {
    expect(parsed.transactions.map((t) => t.amount)).toEqual([250_000, -5000]);
  });

  it("states no balance, because the file contains none", () => {
    expect(parsed.statedBalance).toBeUndefined();
    expect(parsed.transactions.every((t) => t.balance === undefined)).toBe(true);
  });
});

describe("a file that is not a statement at all", () => {
  it("says so rather than returning an empty statement that looks valid", () => {
    const parsed = parseDelimited("hello\nthis is not a statement\n");
    expect(parsed.transactions).toHaveLength(0);
    expect(parsed.warnings[0]).toMatch(/no transaction table/i);
  });

  // The column names are matched in English only. A statement headed in
  // another language is a refusal rather than a guess, which is the right
  // way round: a mis-mapped column would produce a confident wrong balance.
  it("refuses a table whose headings it does not recognise", () => {
    const parsed = parseDelimited(
      ["Datum;Beschreibung;Betrag;Saldo", "04.03.2025;Gehalt;1.250,00;3.400,50"].join("\n")
    );
    expect(parsed.transactions).toHaveLength(0);
    expect(parsed.warnings[0]).toMatch(/column headings/i);
  });
});

describe("warning about a date order it had to guess", () => {
  it("warns when every row could be read either way round", () => {
    const parsed = parseDelimited(
      ["Date,Details,Amount", "03/04/2025,A,100", "05/06/2025,B,200"].join("\n")
    );
    expect(parsed.warnings.some((w) => /day-first/.test(w))).toBe(true);
  });

  it("stays quiet when the file settles it", () => {
    const parsed = parseDelimited(
      ["Date,Details,Amount", "25/04/2025,A,100", "05/06/2025,B,200"].join("\n")
    );
    expect(parsed.warnings.some((w) => /day-first/.test(w))).toBe(false);
  });
});

describe("splitting a row", () => {
  it("keeps a delimiter that is inside quotes", () => {
    expect(splitRow('a,"b,c",d', ",")).toEqual(["a", "b,c", "d"]);
  });

  it("unescapes a doubled quote", () => {
    expect(splitRow('a,"say ""hi""",c', ",")).toEqual(["a", 'say "hi"', "c"]);
  });
});

describe("choosing the delimiter", () => {
  it("does not mistake decimal commas for a comma-separated file", () => {
    const lines = ["Datum;Betrag;Saldo", "04.03.2025;1.250,00;3.400,50", "17.03.2025;-800,00;2.600,50"];
    expect(sniffDelimiter(lines)).toBe(";");
  });

  it("finds tabs", () => {
    expect(sniffDelimiter(["a\tb\tc", "1\t2\t3"])).toBe("\t");
  });
});

describe("combining the money columns", () => {
  it("reads a debit as negative however it was written", () => {
    expect(readAmount(undefined, "1,000.00", "")).toBe(-1000);
  });

  it("reads a credit as positive", () => {
    expect(readAmount(undefined, "", "1,000.00")).toBe(1000);
  });

  it("returns null when there is nothing in any of them, not zero", () => {
    expect(readAmount(undefined, undefined, undefined)).toBeNull();
  });

  it("keeps a genuine zero row when the columns exist", () => {
    expect(readAmount(undefined, "0.00", "0.00")).toBe(0);
  });
});
