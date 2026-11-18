/**
 * Reading a balance from a browser wallet: MetaMask, Rabby, Coinbase Wallet.
 *
 * This is the least invasive way to do "connect my wallet". The wallet
 * extension is already installed, already holds the keys, and already talks
 * to whichever node the student has configured. The app asks it for an
 * address and a balance through EIP-1193 and learns nothing else. There is
 * no API key, no third party, and no account on our side.
 *
 * What it will never do: ask for a seed phrase or a private key, or request
 * any method that can move money. `eth_requestAccounts`, `eth_chainId` and
 * `eth_getBalance` are the whole surface, and the first of those is the only
 * one the student has to approve.
 *
 * It reads the native coin only. Tokens sitting in a wallet need a contract
 * call per token and a token list to know what to ask for, which is more
 * network and more trust than this is worth — those go in by hand, where the
 * student can see what they are declaring.
 */

import type { Holding } from "@/lib/sources/types";
import type { FinancialSource } from "@/lib/sources/types";
import { fromBaseUnits, walletToSource } from "@/lib/sources/wallet";
import { ConnectorError, type Connector, type ConnectorStatus } from "@/lib/sources/connect/types";

/** Native coin per chain id. Decimal is eighteen on every chain here. */
const NATIVE_SYMBOL: Readonly<Record<number, string>> = {
  1: "ETH",
  10: "ETH",
  56: "BNB",
  137: "POL",
  8453: "ETH",
  42161: "ETH",
  43114: "AVAX",
};

const CHAIN_NAMES: Readonly<Record<number, string>> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
};

export function nativeSymbol(chainId: number): string | null {
  return NATIVE_SYMBOL[chainId] ?? null;
}

export function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `chain ${chainId}`;
}

/** Hex chain id as the wallet returns it, to a number. */
export function parseChainId(raw: string): number {
  const value = Number.parseInt(raw, 16);
  return Number.isFinite(value) ? value : 0;
}

interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>;
}

function injectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return candidate && typeof candidate.request === "function" ? candidate : null;
}

/**
 * Turn an address, chain and wei balance into a source.
 *
 * Separate from the talking-to-the-wallet part so it can be tested without a
 * browser, which is where the arithmetic that matters actually lives.
 */
export function evmBalanceToSource(
  address: string,
  chainId: number,
  weiHex: string
): FinancialSource {
  const symbol = nativeSymbol(chainId);
  const quantity = fromBaseUnits(weiHex, 18);

  const holdings: Holding[] = symbol
    ? [
        {
          symbol,
          quantity,
          note: `Read from your wallet on ${chainName(chainId)}. Tokens are not included; add those by hand.`,
        },
      ]
    : [];

  const source = walletToSource({
    address,
    chain: "ethereum",
    holdings,
    label: `${chainName(chainId)} wallet`,
    provenance: {
      origin: "connector",
      importedAt: new Date().toISOString(),
      format: "eip-1193",
    },
  });

  if (symbol) return source;

  return {
    ...source,
    warnings: [
      ...source.warnings,
      `This wallet is on ${chainName(chainId)}, which this app does not know the native coin for. Switch to a chain it knows, or enter the holding by hand.`,
    ],
  };
}

export const evmConnector: Connector = {
  id: "evm",
  name: "Browser wallet",
  kind: "wallet",
  networkNote:
    "Your wallet extension is asked for your address and its balance. The request goes to whichever node your wallet is already configured to use, not to us. No key, seed phrase or signature is ever requested.",

  status(): ConnectorStatus {
    if (typeof window === "undefined") {
      return { available: false, reason: "Only works in the browser." };
    }
    if (!injectedProvider()) {
      return {
        available: false,
        reason:
          "No browser wallet was found. Install one, or enter your holdings by hand below — the result is the same.",
      };
    }
    return { available: true };
  },

  async connect(): Promise<readonly FinancialSource[]> {
    const provider = injectedProvider();
    if (!provider) throw new ConnectorError("No browser wallet is available.");

    let accounts: unknown;
    try {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    } catch (error) {
      // Code 4001 is the user declining, which is not a failure worth an
      // alarming message — they pressed cancel and know they did.
      const code = (error as { code?: number }).code;
      if (code === 4001) {
        throw new ConnectorError("You cancelled the wallet prompt.", true);
      }
      throw new ConnectorError("The wallet would not connect.", true);
    }

    const addresses = Array.isArray(accounts) ? accounts.filter((a): a is string => typeof a === "string") : [];
    if (addresses.length === 0) {
      throw new ConnectorError("The wallet returned no addresses.", true);
    }

    const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
    const chainId = parseChainId(String(chainIdHex));

    // Most wallets expose only the selected account, but some expose several,
    // and a student with two addresses holds the contents of both.
    const sources = await Promise.all(
      addresses.map(async (address) => {
        const wei = (await provider.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        })) as string;
        return evmBalanceToSource(address, chainId, String(wei));
      })
    );

    return sources;
  },
};
