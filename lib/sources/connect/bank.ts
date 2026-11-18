/**
 * Connecting a bank account through an aggregator.
 *
 * Unlike the wallet connector, this one genuinely cannot be done on the
 * device. Open banking works by an aggregator holding a secret key, and a
 * secret key in a browser is not a secret. So there is a server route in
 * `app/api/bank/exchange` that does the exchange, and the whole feature stays
 * switched off unless somebody deploying this app has configured it.
 *
 * Off by default is the point. A student running this locally, or using the
 * hosted copy with no keys set, sees the connector listed as unavailable with
 * a reason, and uploads a statement instead — which gets them the same number
 * without their bank credentials going anywhere.
 *
 * Mono is the adapter written here because it is what Nigerian banks are
 * reachable through. The interface is the part that matters: Plaid, TrueLayer
 * or Okra are the same three steps — widget, exchange a code, read accounts —
 * and belong in sibling files rather than in branches of this one.
 */

import { money } from "@/lib/money";
import type { FinancialSource } from "@/lib/sources/types";
import { maskAccount, newSourceId } from "@/lib/sources/types";
import { ConnectorError, type Connector, type ConnectorStatus } from "@/lib/sources/connect/types";

/** Where the public key lands at build time, when one has been set. */
export const BANK_PUBLIC_KEY = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY ?? "";

export interface BankAccountPayload {
  readonly name?: string;
  readonly accountNumber?: string;
  readonly currency?: string;
  /**
   * Minor units. Mono returns kobo, and an aggregator that returns naira
   * would be off by a hundred — which is why this is named for what it is
   * rather than called `balance`.
   */
  readonly balanceMinorUnits?: number;
  readonly type?: string;
  readonly institution?: string;
}

/** Pull the account out of whichever envelope the response arrived in. */
export function readBankPayload(body: unknown): BankAccountPayload | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const data = (record.data ?? record) as Record<string, unknown>;
  const account = (data.account ?? data) as Record<string, unknown>;
  if (typeof account !== "object" || account === null) return null;

  const institution = account.institution as Record<string, unknown> | undefined;
  const balance = account.balance;

  return {
    name: typeof account.name === "string" ? account.name : undefined,
    accountNumber:
      typeof account.accountNumber === "string" ? account.accountNumber : undefined,
    currency: typeof account.currency === "string" ? account.currency : undefined,
    balanceMinorUnits: typeof balance === "number" ? balance : undefined,
    type: typeof account.type === "string" ? account.type : undefined,
    institution:
      institution && typeof institution.name === "string" ? institution.name : undefined,
  };
}

/**
 * An aggregator's account into a source.
 *
 * Confidence is `stated`: this came from the bank through an authenticated
 * connection and was not inferred from anything. It is the only import in the
 * app that can honestly claim that.
 */
export function bankAccountToSource(payload: BankAccountPayload): FinancialSource {
  const currency = (payload.currency ?? "NGN").toUpperCase();
  const warnings: string[] = [];

  if (payload.balanceMinorUnits === undefined) {
    warnings.push("The bank returned no balance for this account.");
  }

  const amount = (payload.balanceMinorUnits ?? 0) / 100;
  const isSavings = /saving/i.test(payload.type ?? "");
  const institution = payload.institution ?? "Bank";
  const masked = payload.accountNumber ? maskAccount(payload.accountNumber) : undefined;
  const now = new Date().toISOString();

  const overdrawn = amount < 0;

  return {
    id: newSourceId(`bank-${institution}-${payload.accountNumber ?? payload.name ?? ""}`),
    kind: "bank",
    label: masked ? `${institution} ${masked}` : institution,
    institution,
    accountRef: masked,
    balances: overdrawn
      ? []
      : [
          {
            category: isSavings ? "savings" : "cash",
            money: money(amount, currency),
            confidence: "stated",
            asOf: now.slice(0, 10),
            note: "Balance reported by your bank over an authorised connection.",
          },
        ],
    debtDueNow: overdrawn ? money(Math.abs(amount), currency) : undefined,
    included: true,
    provenance: { origin: "connector", importedAt: now, format: "open-banking" },
    warnings: overdrawn
      ? [
          ...warnings,
          "This account is overdrawn. It is counted as a debt rather than as a negative balance, and only debts due now should be deducted.",
        ]
      : warnings,
  };
}

const WIDGET_SRC = "https://connect.withmono.com/connect.js";

interface MonoWidget {
  setup(): void;
  open(): void;
}

interface MonoConstructor {
  new (options: {
    key: string;
    onSuccess: (payload: { code: string }) => void;
    onClose: () => void;
  }): MonoWidget;
}

function loadWidget(): Promise<MonoConstructor> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { Connect?: MonoConstructor }).Connect;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.onload = () => {
      const loaded = (window as unknown as { Connect?: MonoConstructor }).Connect;
      if (loaded) resolve(loaded);
      else reject(new ConnectorError("The bank connection widget did not load."));
    };
    script.onerror = () =>
      reject(new ConnectorError("The bank connection widget could not be reached.", true));
    document.head.appendChild(script);
  });
}

export const bankConnector: Connector = {
  id: "bank",
  name: "Connect a bank account",
  kind: "bank",
  networkNote:
    "Your bank login is handled by the provider's own window, never by this app and never by this page. This app receives a balance and an account number, and keeps neither after you close the tab.",

  status(): ConnectorStatus {
    if (typeof window === "undefined") {
      return { available: false, reason: "Only works in the browser." };
    }
    if (!BANK_PUBLIC_KEY) {
      return {
        available: false,
        reason:
          "Bank connections are not configured on this copy of the app. Upload a statement instead — it reaches the same number without your bank login leaving your device.",
      };
    }
    return { available: true };
  },

  async connect(): Promise<readonly FinancialSource[]> {
    if (!BANK_PUBLIC_KEY) {
      throw new ConnectorError("Bank connections are not configured on this copy of the app.");
    }

    const Connect = await loadWidget();

    const code = await new Promise<string>((resolve, reject) => {
      const widget = new Connect({
        key: BANK_PUBLIC_KEY,
        onSuccess: ({ code: received }) => resolve(received),
        onClose: () => reject(new ConnectorError("You closed the bank window.", true)),
      });
      widget.setup();
      widget.open();
    });

    const response = await fetch("/api/bank/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ConnectorError(
        detail || "The bank connection could not be completed.",
        response.status >= 500
      );
    }

    const payload = readBankPayload(await response.json());
    if (!payload) {
      throw new ConnectorError("The bank returned something this app could not read.");
    }

    return [bankAccountToSource(payload)];
  },
};
