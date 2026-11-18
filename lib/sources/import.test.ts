import { describe, expect, it } from "vitest";
import { aggregate } from "@/lib/sources/aggregate";
import { findDuplicates } from "@/lib/sources/duplicates";
import { importStatementText } from "@/lib/sources/import";
import { walletToSource } from "@/lib/sources/wallet";
import { computeZakat } from "@/lib/zakat";

const GTBANK = `Account Statement
Account Number,0123456789
Account Type,Savings Account
Currency,NGN
Closing Balance,"1,402,500.00"

Transaction Date,Narration,Debit,Credit,Balance
01/03/2025,OPENING BALANCE,,,"1,000,000.00"
17/03/2025,POS PURCHASE,"97,500.00",,"1,402,500.00"
`;

const DOMICILIARY = `Date,Description,Amount,Balance
2025-03-02,SALARY USD,500.00,500.00
2025-03-20,CARD PAYMENT,-120.00,380.00
`;

const now = new Date("2025-03-31T00:00:00.000Z");

describe("a student with two banks and a wallet", () => {
  const gtbank = importStatementText(GTBANK, { fileName: "gtbank.csv", now });
  const dom = importStatementText(DOMICILIARY, { fileName: "domiciliary.csv", defaultCurrency: "USD", now });
  const wallet = walletToSource({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    holdings: [{ symbol: "ETH", quantity: 0.4 }],
    provenance: { origin: "typed", importedAt: now.toISOString() },
  });

  const result = aggregate([gtbank, dom, wallet], { USD: 1600, ETH: 5_000_000 });

  it("reads each file without being told which bank it came from", () => {
    expect(gtbank.balances[0].money).toEqual({ amount: 1_402_500, currency: "NGN" });
    expect(dom.balances[0].money).toEqual({ amount: 380, currency: "USD" });
  });

  it("adds them up into one zakatable total", () => {
    expect(result.assets.savings).toBe(1_402_500);
    expect(result.assets.cash).toBe(380 * 1600 + 0.4 * 5_000_000);
    expect(result.complete).toBe(true);
  });

  it("produces a zakat figure from the lot", () => {
    const zakat = computeZakat({
      assets: result.assets,
      liabilities: { immediateDebts: result.immediateDebts },
      nisabBasis: "silver",
      goldPricePerGram: 0,
      silverPricePerGram: 1500,
    });
    const netWealth = 1_402_500 + 380 * 1600 + 0.4 * 5_000_000;
    expect(zakat.netWealth).toBe(netWealth);
    expect(zakat.meetsNisab).toBe(true);
    expect(zakat.zakatDue).toBeCloseTo(netWealth * 0.025, 6);
  });

  it("says the total is short while a rate is missing, rather than quietly omitting it", () => {
    const partial = aggregate([gtbank, dom, wallet], { USD: 1600 });
    expect(partial.complete).toBe(false);
    expect(partial.missingRates).toEqual(["ETH"]);
  });
});

describe("the same statement downloaded twice", () => {
  it("is caught even when the browser renamed the second copy", () => {
    const first = importStatementText(GTBANK, { fileName: "statement.csv", now });
    const second = importStatementText(GTBANK, { fileName: "statement (1).csv", now });
    expect(first.id).not.toBe(second.id);
    expect(findDuplicates([first, second])[0].reason).toBe("same-file");
  });

  it("would double the account if both were counted, which is why it is flagged", () => {
    const first = importStatementText(GTBANK, { fileName: "a.csv", now });
    const second = importStatementText(GTBANK, { fileName: "b.csv", now });
    expect(aggregate([first, second], {}).assets.savings).toBe(2 * 1_402_500);
  });
});

describe("a PDF", () => {
  it("is refused with something the student can actually do instead", () => {
    const source = importStatementText("%PDF-1.4 binary rubbish", { fileName: "statement.pdf", now });
    expect(source.balances).toHaveLength(0);
    expect(source.warnings.join(" ")).toMatch(/does not send your statement anywhere/);
    expect(source.warnings.join(" ")).toMatch(/paste it into the box/);
  });
});

describe("an OFX file", () => {
  it("goes through the same door as a CSV", () => {
    const source = importStatementText(
      `OFXHEADER:100
<OFX><STMTRS><CURDEF>NGN<BANKACCTFROM><ACCTID>0123456789<ACCTTYPE>SAVINGS</BANKACCTFROM>
<LEDGERBAL><BALAMT>250000.00<DTASOF>20250331</LEDGERBAL></STMTRS></OFX>`,
      { fileName: "statement.ofx", now }
    );
    expect(source.balances[0].money).toEqual({ amount: 250_000, currency: "NGN" });
    expect(source.balances[0].confidence).toBe("stated");
  });
});

describe("a JSON export from an exchange", () => {
  it("is read with the same column mapping as a CSV", () => {
    const source = importStatementText(
      JSON.stringify({
        transactions: [
          { date: "2025-03-01", description: "Deposit", amount: "1000.00", balance: "1000.00" },
          { date: "2025-03-15", description: "Withdrawal", amount: "-250.00", balance: "750.00" },
        ],
      }),
      { fileName: "exchange.json", defaultCurrency: "USDT", now }
    );
    expect(source.balances[0].money).toEqual({ amount: 750, currency: "USDT" });
  });
});

describe("a statement that is only transactions", () => {
  it("refuses to present the net flow as a balance", () => {
    const source = importStatementText(
      ["Date,Details,Amount", "2025-03-04,SALARY,250000", "2025-03-28,RENT,-248000"].join("\n"),
      { fileName: "flows.csv", now }
    );
    expect(source.balances).toHaveLength(0);
    expect(aggregate([source], {}).assets.cash).toBe(0);
  });
});
