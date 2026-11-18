"use client";

import { useId, useState } from "react";
import { Globe, Plug, X } from "lucide-react";
import { CONNECTORS, ConnectorError } from "@/lib/sources/connect";
import type { FinancialSource, Holding } from "@/lib/sources/types";
import { CHAIN_LABELS, detectChain, walletToSource } from "@/lib/sources/wallet";

/**
 * Adding crypto, by connecting a wallet or by saying what is in it.
 *
 * Entering holdings by hand is listed first and works everywhere. Connecting
 * is the convenience, not the main path: it needs an extension, it only ever
 * reads the native coin, and a student holding USDT on an exchange has
 * nothing to connect in the first place.
 *
 * Quantities, never values. The student says they hold 0.4 ETH; what that is
 * worth in their home currency is a rate they enter further down, exactly as they enter a
 * gold price. The app does not fetch it and does not pretend to know it.
 */
export function WalletForm({
  onAdd,
}: {
  onAdd: (sources: readonly FinancialSource[]) => void;
}) {
  const addressId = useId();
  const [address, setAddress] = useState("");
  const [rows, setRows] = useState<{ symbol: string; quantity: string }[]>([
    { symbol: "", quantity: "" },
  ]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chain = address.trim() === "" ? null : detectChain(address);

  function add() {
    const holdings: Holding[] = rows
      .map((row) => ({ symbol: row.symbol.trim().toUpperCase(), quantity: Number(row.quantity) }))
      .filter((row) => row.symbol !== "" && Number.isFinite(row.quantity) && row.quantity > 0);

    if (holdings.length === 0) {
      setError("Enter at least one holding with a quantity above zero.");
      return;
    }

    setError(null);
    onAdd([
      walletToSource({
        address: address.trim() === "" ? undefined : address.trim(),
        holdings,
        provenance: { origin: "wallet", importedAt: new Date().toISOString() },
      }),
    ]);
    setAddress("");
    setRows([{ symbol: "", quantity: "" }]);
  }

  async function connect(id: string) {
    const connector = CONNECTORS.find((c) => c.id === id);
    if (!connector) return;
    setConnecting(id);
    setError(null);
    try {
      onAdd(await connector.connect());
    } catch (caught) {
      setError(
        caught instanceof ConnectorError ? caught.message : "That connection did not work."
      );
    } finally {
      setConnecting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-[var(--color-rule)] bg-[var(--surface)] p-3.5">
        <h3 className="text-sm font-medium">What you hold</h3>

        {rows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={row.symbol}
              onChange={(e) => updateRow(setRows, index, { symbol: e.target.value })}
              placeholder="BTC"
              aria-label={`Token ${index + 1}`}
              className="w-24 rounded-xl border border-[var(--color-rule)] bg-transparent px-2.5 py-2 text-sm uppercase outline-none focus:border-[var(--color-brand)]"
            />
            <input
              value={row.quantity}
              onChange={(e) => updateRow(setRows, index, { quantity: e.target.value })}
              placeholder="0.5"
              inputMode="decimal"
              aria-label={`Quantity ${index + 1}`}
              className="w-full rounded-xl border border-[var(--color-rule)] bg-transparent px-2.5 py-2 text-sm font-mono-nums tabular-nums outline-none focus:border-[var(--color-brand)]"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                aria-label={`Remove holding ${index + 1}`}
                className="tap shrink-0 rounded-full p-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-over)]/10 hover:text-[var(--color-over)]"
              >
                <X aria-hidden className="size-4" strokeWidth={2} />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRows((current) => [...current, { symbol: "", quantity: "" }])}
          className="tap text-xs font-medium text-[var(--color-brand)] underline underline-offset-2"
        >
          Add another token
        </button>

        <div>
          <label htmlFor={addressId} className="text-sm font-medium">
            Wallet address
            <span className="font-normal text-[var(--color-ink-soft)]"> (optional)</span>
          </label>
          <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
            Only used to label this wallet and to notice if you add it twice. Nothing is
            looked up.
          </p>
          <input
            id={addressId}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--color-rule)] bg-transparent px-2.5 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          />
          {chain && (
            <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
              {chain === "unknown"
                ? "That does not look like an address this app recognises. It will still be saved as a label."
                : `Looks like ${CHAIN_LABELS[chain]}.`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={add}
          className="tap rounded-full border border-[var(--color-rule)] px-3.5 py-1.5 text-sm font-medium"
        >
          Add these holdings
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Plug aria-hidden className="size-3.5 text-[var(--color-ink-soft)]" strokeWidth={1.8} />
          Or connect
        </h3>
        {CONNECTORS.map((connector) => {
          const status = connector.status();
          return (
            <div
              key={connector.id}
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--surface)] p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{connector.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                    {status.available ? connector.networkNote : status.reason}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!status.available || connecting !== null}
                  onClick={() => void connect(connector.id)}
                  className="tap shrink-0 rounded-full border border-[var(--color-rule)] px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {connecting === connector.id ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          );
        })}
        <p className="flex items-start gap-1.5 text-xs text-[var(--color-ink-soft)]">
          <Globe aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
          Connecting is the only part of this app that touches a network. Everything else,
          including every statement you upload, stays on this device.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-over)]">
          {error}
        </p>
      )}
    </div>
  );
}

function updateRow(
  setRows: React.Dispatch<React.SetStateAction<{ symbol: string; quantity: string }[]>>,
  index: number,
  patch: Partial<{ symbol: string; quantity: string }>
) {
  setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
}
