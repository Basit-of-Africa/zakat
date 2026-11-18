/**
 * Crypto holdings as a source.
 *
 * Two things are deliberately not decided here.
 *
 * The first is the price. A quantity of a token is a fact about a wallet; its
 * worth in naira is a figure that changes by the minute and that this app
 * does not fetch — the student enters a rate, the same way they enter a gold
 * price, and the conversion happens in `lib/money.ts`. So a wallet source
 * carries quantities, not values.
 *
 * The second is the category. Whether a token held as a long-term bet is
 * trade goods, cash, or outside zakat altogether is a question scholars are
 * actively differing on, and this project's rule is that a difference becomes
 * an option rather than a constant. So the category is a field the student
 * sets, with both readings named in the interface, and the default is simply
 * the most common treatment rather than a position.
 */

import { money, type RateTable } from "@/lib/money";
import type { AssetCategory, FinancialSource, Holding, Provenance } from "@/lib/sources/types";
import { newSourceId } from "@/lib/sources/types";

export type Chain = "bitcoin" | "ethereum" | "solana" | "tron" | "unknown";

export const CHAIN_LABELS: Readonly<Record<Chain, string>> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum or an EVM chain",
  solana: "Solana",
  tron: "Tron",
  unknown: "Unrecognised",
};

/**
 * Guess the chain from the shape of the address.
 *
 * Shape only — this says nothing about whether the address exists, and the
 * interface should not imply that it does. It is here so that a student who
 * pastes an Ethereum address into a field labelled Bitcoin is told, rather
 * than going on to enter a bitcoin price against it.
 *
 * The order matters. A bech32 bitcoin address and a Solana address are both
 * base58-ish strings of a similar length, so the distinctive prefixes are
 * tested before the catch-all.
 */
export function detectChain(address: string): Chain {
  const value = address.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return "ethereum";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return "tron";
  if (/^(bc1|tb1)[02-9ac-hj-np-z]{11,71}$/i.test(value)) return "bitcoin";
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(value)) return "bitcoin";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return "solana";
  return "unknown";
}

/** Enough of the address to tell two apart, and no more of it than that. */
export function shortenAddress(address: string): string {
  const value = address.trim();
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export interface WalletInput {
  readonly label?: string;
  readonly address?: string;
  readonly chain?: Chain;
  readonly holdings: readonly Holding[];
  /** Where the student has placed crypto. Theirs to decide, not ours. */
  readonly category?: AssetCategory;
  readonly provenance: Provenance;
}

export function walletToSource(input: WalletInput): FinancialSource {
  const chain = input.chain ?? (input.address ? detectChain(input.address) : "unknown");
  const category: AssetCategory = input.category ?? "cash";
  const warnings: string[] = [];

  const holdings = input.holdings.filter((h) => h.symbol.trim() !== "" && h.quantity > 0);

  if (holdings.length === 0) {
    // Worded by where it came from: "nothing was entered" is wrong for a
    // wallet that connected fine and genuinely holds nothing.
    warnings.push(
      input.provenance.origin === "connector"
        ? "This wallet holds nothing, so it adds nothing to the total."
        : "No holdings were entered for this wallet, so it adds nothing to the total."
    );
  }

  if (input.address && chain === "unknown") {
    warnings.push(
      "That address does not match any chain this app recognises. The quantities you enter still count; only the label may be wrong."
    );
  }

  const label =
    input.label ??
    (input.address ? `${CHAIN_LABELS[chain]} ${shortenAddress(input.address)}` : "Crypto holdings");

  return {
    id: newSourceId(`${chain}${input.address ?? label}`),
    kind: "wallet",
    label,
    institution: CHAIN_LABELS[chain],
    accountRef: input.address ? shortenAddress(input.address) : undefined,
    balances: holdings.map((holding) => ({
      category,
      money: money(holding.quantity, holding.symbol),
      confidence: input.provenance.origin === "connector" ? "stated" : "estimated",
      note:
        holding.note ??
        "Valued at the rate you enter. Whether crypto is zakatable, and as what, is a question for your scholar.",
    })),
    included: true,
    provenance: { ...input.provenance, chain, address: input.address },
    warnings,
  };
}

/** The tickers a wallet source needs a rate for before it can be totalled. */
export function unratedSymbols(source: FinancialSource, rates: RateTable): readonly string[] {
  const missing = new Set<string>();
  for (const balance of source.balances) {
    const symbol = balance.money.currency;
    if (symbol === "NGN") continue;
    const rate = rates[symbol];
    if (!Number.isFinite(rate) || rate === undefined || rate <= 0) missing.add(symbol);
  }
  return [...missing].sort();
}

/**
 * Base units to a human quantity — wei to ether, satoshi to bitcoin.
 *
 * The division is done on the digit string rather than by dividing a float by
 * 1e18. Doing it in floating point loses precision partway through the
 * fraction, and a balance that is quietly wrong in its fourth decimal place
 * is exactly the kind of error this project cannot afford.
 */
export function fromBaseUnits(value: string, decimals: number): number {
  const trimmed = value.trim();
  const asDecimal = /^0x/i.test(trimmed)
    ? BigInt(trimmed).toString()
    : trimmed.replace(/[^0-9]/g, "");
  if (asDecimal === "") return 0;

  const padded = asDecimal.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = decimals > 0 ? padded.slice(padded.length - decimals) : "";
  return Number(fraction === "" ? whole : `${whole}.${fraction}`);
}
