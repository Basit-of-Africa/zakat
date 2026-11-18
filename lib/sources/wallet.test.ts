import { describe, expect, it } from "vitest";
import { detectChain, fromBaseUnits, shortenAddress, unratedSymbols, walletToSource } from "@/lib/sources/wallet";
import { evmBalanceToSource, nativeSymbol, parseChainId } from "@/lib/sources/connect/evm";

const provenance = { origin: "typed" as const, importedAt: "2025-03-31T00:00:00.000Z" };

describe("recognising an address", () => {
  it("knows an EVM address", () => {
    expect(detectChain("0x1234567890abcdef1234567890abcdef12345678")).toBe("ethereum");
  });

  it("knows a legacy and a bech32 bitcoin address", () => {
    expect(detectChain("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe("bitcoin");
    expect(detectChain("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe("bitcoin");
  });

  it("says so rather than guessing when it does not recognise one", () => {
    expect(detectChain("not-an-address")).toBe("unknown");
  });
});

describe("a wallet entered by hand", () => {
  it("carries quantities, not values, because the price is the student's to give", () => {
    const source = walletToSource({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      holdings: [{ symbol: "ETH", quantity: 1.5 }],
      provenance,
    });
    expect(source.balances[0].money).toEqual({ amount: 1.5, currency: "ETH" });
  });

  it("defaults to cash but lets the student put it somewhere else", () => {
    const asTrade = walletToSource({
      holdings: [{ symbol: "BTC", quantity: 0.1 }],
      category: "tradeGoods",
      provenance,
    });
    expect(asTrade.balances[0].category).toBe("tradeGoods");
  });

  it("drops a holding of nothing rather than carrying an empty row", () => {
    const source = walletToSource({ holdings: [{ symbol: "ETH", quantity: 0 }], provenance });
    expect(source.balances).toHaveLength(0);
    expect(source.warnings[0]).toMatch(/adds nothing/);
  });

  it("warns when the address does not match any chain it knows", () => {
    const source = walletToSource({ address: "rubbish", holdings: [{ symbol: "ETH", quantity: 1 }], provenance });
    expect(source.warnings.some((w) => /does not match any chain/.test(w))).toBe(true);
  });

  it("shows enough of the address to tell two apart and no more", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234...5678");
  });
});

describe("knowing which rates are still needed", () => {
  it("names the tickers with no rate against them", () => {
    const source = walletToSource({
      holdings: [{ symbol: "BTC", quantity: 0.1 }, { symbol: "ETH", quantity: 2 }],
      provenance,
    });
    expect(unratedSymbols(source, { BTC: 95_000_000 })).toEqual(["ETH"]);
  });
});

describe("converting base units", () => {
  it("turns wei into ether without losing the small end", () => {
    expect(fromBaseUnits("1500000000000000000", 18)).toBe(1.5);
    expect(fromBaseUnits("0x16345785d8a0000", 18)).toBe(0.1);
  });

  it("keeps a figure that floating point division would round away", () => {
    expect(fromBaseUnits("1000000000000001", 18)).toBe(0.001000000000000001);
  });

  it("returns nothing for an empty balance rather than throwing", () => {
    expect(fromBaseUnits("", 18)).toBe(0);
  });
});

describe("a balance read from a browser wallet", () => {
  it("names the coin from the chain it is on", () => {
    const source = evmBalanceToSource("0x1234567890abcdef1234567890abcdef12345678", 137, "0x16345785d8a0000");
    expect(source.balances[0].money).toEqual({ amount: 0.1, currency: "POL" });
    expect(source.label).toBe("Polygon wallet");
  });

  it("is marked as stated, because the wallet reported it", () => {
    const source = evmBalanceToSource("0x1234567890abcdef1234567890abcdef12345678", 1, "0xde0b6b3a7640000");
    expect(source.balances[0].confidence).toBe("stated");
    expect(source.balances[0].money.amount).toBe(1);
  });

  it("says plainly that tokens are not included", () => {
    const source = evmBalanceToSource("0x1234567890abcdef1234567890abcdef12345678", 1, "0xde0b6b3a7640000");
    expect(source.balances[0].note).toMatch(/Tokens are not included/);
  });

  it("does not claim nothing was entered when the wallet simply holds nothing", () => {
    const source = evmBalanceToSource("0x1234567890abcdef1234567890abcdef12345678", 1, "0x0");
    expect(source.balances).toHaveLength(0);
    expect(source.warnings[0]).toBe("This wallet holds nothing, so it adds nothing to the total.");
  });

  it("asks for the holding by hand on a chain it does not know", () => {
    const source = evmBalanceToSource("0x1234567890abcdef1234567890abcdef12345678", 99999, "0xde0b6b3a7640000");
    expect(source.balances).toHaveLength(0);
    expect(source.warnings.some((w) => /by hand/.test(w))).toBe(true);
  });

  it("reads the chain id the wallet gives it", () => {
    expect(parseChainId("0x89")).toBe(137);
    expect(nativeSymbol(56)).toBe("BNB");
    expect(nativeSymbol(99999)).toBeNull();
  });
});
