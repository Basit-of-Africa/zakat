import { describe, expect, it } from "vitest";
import { ofxDate, parseOfx } from "@/lib/sources/statement/ofx";

/** OFX 1.x: SGML, no closing tags on leaf elements. This is the common one. */
const SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<SIGNONMSGSRSV1><SONRS><FI><ORG>GTBank<FID>058</FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>NGN
<BANKACCTFROM><ACCTID>0123456789<ACCTTYPE>SAVINGS</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20250304120000[+1:WAT]<TRNAMT>500000.00<NAME>TRF FROM FATHER</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20250317090000<TRNAMT>-97500.00<NAME>POS SHOPRITE</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>1402500.00<DTASOF>20250331</LEDGERBAL>
<AVAILBAL><BALAMT>1395000.00<DTASOF>20250331</AVAILBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("an OFX statement", () => {
  const parsed = parseOfx(SGML);

  it("takes the ledger balance, which is the one the bank stands behind", () => {
    expect(parsed.statedBalance).toBe(1_402_500);
  });

  it("does not take the available balance when a ledger balance exists", () => {
    expect(parsed.statedBalance).not.toBe(1_395_000);
  });

  it("knows the date the balance was true on", () => {
    expect(parsed.statedBalanceAsOf).toBe("2025-03-31");
  });

  it("reads the bank, the account and the currency", () => {
    expect(parsed.institution).toBe("GTBank");
    expect(parsed.accountRef).toBe("0123456789");
    expect(parsed.currency).toBe("NGN");
    expect(parsed.accountType).toBe("savings");
  });

  it("reads the transactions with their signs intact", () => {
    expect(parsed.transactions.map((t) => t.amount)).toEqual([500_000, -97_500]);
    expect(parsed.transactions[0].date).toBe("2025-03-04");
  });
});

describe("an OFX statement with only an available balance", () => {
  const parsed = parseOfx(
    `<OFX><STMTRS><CURDEF>USD<AVAILBAL><BALAMT>250.00<DTASOF>20250331</AVAILBAL></STMTRS></OFX>`
  );

  it("falls back to it rather than returning nothing", () => {
    expect(parsed.statedBalance).toBe(250);
  });

  it("says that an available balance may be lower than the real one", () => {
    expect(parsed.warnings.some((w) => /not yet cleared/.test(w))).toBe(true);
  });
});

describe("OFX dates", () => {
  it("reads the date out of a timestamp with a timezone glued on", () => {
    expect(ofxDate("20250304120000[+1:WAT]")).toBe("2025-03-04");
  });

  it("returns nothing for a date that is not one", () => {
    expect(ofxDate("not a date")).toBeUndefined();
  });
});
