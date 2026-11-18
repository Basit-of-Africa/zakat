/**
 * Money with a currency attached, and conversion by rates the user supplies.
 *
 * The project rule is that no price is ever fetched — see the README. That
 * rule is the reason this module takes a rate table rather than owning one.
 * A student with a dollar account, a pound savings account and half a bitcoin
 * has three numbers that are not naira, and the only honest way to add them
 * up is to make them say what each is worth today.
 *
 * The important behaviour here is the refusal: an amount in a currency with
 * no rate is NOT quietly dropped, and NOT quietly treated as naira. It comes
 * back as unconverted, and the caller is expected to say so out loud. A
 * silently omitted dollar account understates zakat, and understated zakat is
 * the one failure mode this project cannot ship.
 */

/** The default home currency, for callers (and tests) that do not pass one. */
export const BASE_CURRENCY = "NGN";

export interface Money {
  readonly amount: number;
  /** ISO 4217 for money, ticker for crypto — "NGN", "USD", "BTC", "USDT". */
  readonly currency: string;
}

/**
 * Units of the home currency for one unit of the key currency, as the person
 * looked it up today. With naira at home, `BTC: 95000000` reads "one bitcoin is
 * ninety-five million naira".
 * Crypto tickers sit in the same table as fiat deliberately: converting half
 * a bitcoin and converting fifty dollars are the same arithmetic, and giving
 * them two code paths would mean two places to get it wrong.
 */
export type RateTable = Readonly<Record<string, number>>;

export function normaliseCurrency(code: string): string {
  return code.trim().toUpperCase();
}

export function money(amount: number, currency: string): Money {
  return { amount, currency: normaliseCurrency(currency) };
}

export interface Conversion {
  /** Value in the home currency, or null when no rate was available. */
  readonly amount: number | null;
  readonly rate: number | null;
  readonly missingRate: boolean;
}

export function convert(value: Money, rates: RateTable, base: string = BASE_CURRENCY): Conversion {
  const currency = normaliseCurrency(value.currency);

  if (currency === normaliseCurrency(base)) {
    return { amount: value.amount, rate: 1, missingRate: false };
  }

  const rate = rates[currency];
  // A rate of zero is not a rate. It is almost always an empty input box that
  // got through as a number, and treating it as "this is worth nothing" would
  // wipe a real holding off the total.
  if (!Number.isFinite(rate) || rate === undefined || rate <= 0) {
    return { amount: null, rate: null, missingRate: true };
  }

  return { amount: value.amount * rate, rate, missingRate: false };
}

/** The currencies in `values` that `rates` cannot convert, each once. */
export function missingRatesFor(
  values: readonly Money[],
  rates: RateTable,
  base: string = BASE_CURRENCY
): readonly string[] {
  const missing = new Set<string>();
  for (const value of values) {
    if (value.amount === 0) continue; // nothing to lose, so nothing to warn about
    if (convert(value, rates, base).missingRate) missing.add(normaliseCurrency(value.currency));
  }
  return [...missing].sort();
}

/** Crypto needs more than naira's zero decimals, and fiat needs exactly two. */
export function formatMoney(value: Money): string {
  const currency = normaliseCurrency(value.currency);
  const decimals = CRYPTO_DECIMALS[currency] ?? (currency === BASE_CURRENCY || currency === "JPY" || currency === "IDR" ? 0 : 2);
  const formatted = value.amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${currency}`;
}

/**
 * How many decimals are worth showing per ticker. Not the chain's precision —
 * bitcoin has eight and ether eighteen — just enough that a holding does not
 * round to zero on screen while someone is checking their own figures.
 */
const CRYPTO_DECIMALS: Readonly<Record<string, number>> = {
  BTC: 8,
  ETH: 6,
  SOL: 6,
  USDT: 2,
  USDC: 2,
};

export const KNOWN_CRYPTO = Object.keys(CRYPTO_DECIMALS);

export function isCrypto(currency: string): boolean {
  return normaliseCurrency(currency) in CRYPTO_DECIMALS;
}
