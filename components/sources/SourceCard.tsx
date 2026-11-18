"use client";

import { useId } from "react";
import { Landmark, TriangleAlert, Wallet, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import {
  ASSET_CATEGORIES,
  CATEGORY_LABELS,
  CONFIDENCE_NOTES,
  type AssetCategory,
  type FinancialSource,
} from "@/lib/sources/types";
import { CategoryIcon } from "@/components/sources/CategoryIcon";

/**
 * One account, as a row the student can argue with.
 *
 * Three things are always visible and none of them are optional extras.
 *
 * The figure, with where it came from — "read directly from the statement"
 * against "worked out, with an assumption in it" is the difference between a
 * number to pay on and a number to check.
 *
 * The category, as a control rather than a label. A savings account is an
 * easy guess from the file; whether the money in it is the student's savings
 * or a float they hold for a society is not.
 *
 * The switch to leave it out. Importing an account is not a claim that its
 * contents are zakatable, and plenty of what lands in a statement belongs to
 * somebody else.
 */
export function SourceCard({
  source,
  onChange,
  onRemove,
  duplicateMessage,
}: {
  source: FinancialSource;
  onChange: (next: FinancialSource) => void;
  onRemove: () => void;
  duplicateMessage?: string;
}) {
  const includeId = useId();
  const categoryId = useId();

  const category = source.balances[0]?.category;
  const period =
    source.provenance.periodStart && source.provenance.periodEnd
      ? `${source.provenance.periodStart} to ${source.provenance.periodEnd}`
      : undefined;

  function setCategory(next: AssetCategory) {
    onChange({
      ...source,
      balances: source.balances.map((balance) => ({ ...balance, category: next })),
    });
  }

  return (
    <li
      className={`rounded-2xl border p-3.5 transition-opacity duration-200 ${
        source.included
          ? "border-[var(--color-rule)] bg-[var(--surface)]"
          : "border-dashed border-[var(--color-rule)] opacity-55"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            {source.kind === "wallet" ? (
              <Wallet aria-hidden className="size-3.5" strokeWidth={1.8} />
            ) : (
              <Landmark aria-hidden className="size-3.5" strokeWidth={1.8} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{source.label}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">
              {describeKind(source)}
              {period ? ` · ${period}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${source.label}`}
          className="tap shrink-0 rounded-full p-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-over)]/10 hover:text-[var(--color-over)]"
        >
          <X aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </div>

      {source.balances.length > 0 ? (
        <dl className="mt-2.5 space-y-1">
          {source.balances.map((balance, index) => (
            <div key={`${balance.money.currency}-${index}`} className="flex justify-between gap-3 text-sm">
              <dt className="text-[var(--color-ink-soft)]">
                {balance.asOf ? `As at ${balance.asOf}` : "Balance"}
              </dt>
              <dd className="font-mono-nums tabular-nums">{formatMoney(balance.money)}</dd>
            </div>
          ))}
          <p className="text-xs text-[var(--color-ink-soft)]">
            {CONFIDENCE_NOTES[source.balances[0].confidence]}
          </p>
        </dl>
      ) : (
        <p className="mt-2.5 text-sm text-[var(--color-ink-soft)]">
          No balance could be read from this one.
        </p>
      )}

      {source.debtDueNow && (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm text-[var(--color-over)]">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          Overdrawn by {formatMoney(source.debtDueNow)}, counted as a debt.
        </p>
      )}

      {duplicateMessage && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-[var(--color-short)]/40 bg-[var(--color-gold-soft)] p-2 text-xs">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 text-[var(--color-short)]"
            strokeWidth={2}
          />
          {duplicateMessage}
        </p>
      )}

      {source.warnings.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {source.warnings.map((warning) => (
            <li key={warning} className="text-xs text-[var(--color-ink-soft)]">
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-rule)] pt-2.5">
        <div className="flex items-center gap-2">
          <input
            id={includeId}
            type="checkbox"
            checked={source.included}
            onChange={(e) => onChange({ ...source, included: e.target.checked })}
            className="accent-[var(--color-brand)]"
          />
          <label htmlFor={includeId} className="text-xs">
            Count this
          </label>
        </div>

        {category && (
          <div className="flex items-center gap-2">
            <label htmlFor={categoryId} className="flex items-center gap-1 text-xs text-[var(--color-ink-soft)]">
              <CategoryIcon category={category} className="size-3.5" />
              Counts as
            </label>
            <select
              id={categoryId}
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="rounded-full border border-[var(--color-rule)] bg-transparent px-2.5 py-1 text-xs outline-none focus:border-[var(--color-brand)]"
            >
              {ASSET_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {CATEGORY_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </li>
  );
}

function describeKind(source: FinancialSource): string {
  switch (source.kind) {
    case "bank":
      return "Connected bank account";
    case "wallet":
      return source.provenance.origin === "connector" ? "Connected wallet" : "Wallet, entered by hand";
    case "manual":
      return "Entered by hand";
    default:
      return source.provenance.fileName ?? "Pasted statement";
  }
}
