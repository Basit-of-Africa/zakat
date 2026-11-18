"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileSpreadsheet, HandCoins, LockKeyhole, ScanSearch, TriangleAlert, X } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { Field } from "@/components/Field";
import { Meter } from "@/components/Meter";
import { parseStatement } from "@/lib/sources/statement/parse";
import { readFileText, tooLarge } from "@/lib/sources/import";
import type { Transaction } from "@/lib/sources/types";
import { findingsCsv, screen, summarise, type Verdict } from "@/lib/business/screen";
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, computeZakat, formatIn, type NisabBasis } from "@/lib/zakat";
import { CURRENCIES, useHomeCurrency } from "@/lib/currency";
import { usePersistentState } from "@/lib/persist";

const num = (v: string) => {
  const n = Number(v.replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function Business() {
  const [tab, setTab] = useState<"audit" | "zakat">("audit");
  const home = useHomeCurrency();
  return (
    <div className="min-h-dvh bg-[var(--color-wash)]">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-[var(--color-brand)]">For businesses</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Audit your books, and work out your zakat.</h1>
            <p className="mt-1.5 max-w-2xl text-[15px] text-[var(--color-ink-soft)]">
              Screen your transactions for interest and other income that needs purifying, and calculate the business&apos;s zakat on its trade assets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="biz-currency" className="text-sm font-bold">Currency</label>
            <select id="biz-currency" value={home.currency} onChange={(e) => home.setCurrency(e.target.value)} className="h-10 rounded-md border-2 border-[var(--color-ink)] bg-[var(--color-card)] px-2 text-sm font-bold">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </select>
            <p className="flex items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
              <LockKeyhole className="size-3.5 text-[var(--color-brand)]" /> Files are read on this device, never uploaded
            </p>
          </div>
        </div>

        <div role="tablist" className="mt-6 grid gap-2 sm:max-w-xl sm:grid-cols-2">
          {([["audit", "Purification audit", "Flag non-halal income and spending"], ["zakat", "Business zakat", "Zakat on trade assets"]] as const).map(([id, label, hint]) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`rounded-2xl border bg-[var(--color-card)] px-4 py-3 text-left transition-all ${tab === id ? "border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]" : "border-[var(--color-rule)] hover:border-[var(--color-rule-strong)]"}`}>
              <span className={`block text-sm font-semibold ${tab === id ? "text-[var(--color-brand)]" : ""}`}>{label}</span>
              <span className="block text-xs text-[var(--color-ink-soft)]">{hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">{tab === "audit" ? <Audit currency={home.currency} /> : <BusinessZakat currency={home.currency} symbol={home.symbol} />}</div>
      </main>
    </div>
  );
}

function Audit({ currency }: { currency: string }) {
  const fmt = (n: number) => formatIn(n, currency);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
  const [filter, setFilter] = useState<"flagged" | "review" | "all">("flagged");
  const [dragging, setDragging] = useState(false);

  const findings = useMemo(() => screen(transactions), [transactions]);
  const byIndex = useMemo(() => new Map(findings.map((f) => [f.index, f])), [findings]);
  const summary = useMemo(() => summarise(transactions, findings, verdicts), [transactions, findings, verdicts]);

  async function take(list: FileList | null) {
    if (!list) return;
    const added: Transaction[] = [];
    const notes: string[] = [];
    for (const file of Array.from(list)) {
      if (tooLarge(file)) { notes.push(`${file.name} is too large to read.`); continue; }
      const parsed = parseStatement(await readFileText(file), file.name, currency);
      if (parsed.transactions.length === 0) notes.push(`${file.name}: ${parsed.warnings[0] ?? "no transactions found."}`);
      added.push(...parsed.transactions);
      setFiles((f) => [...f, file.name]);
    }
    setTransactions((t) => [...t, ...added]);
    setWarnings((w) => [...w, ...notes]);
  }

  const rows = transactions
    .map((t, index) => ({ t, index, f: byIndex.get(index) }))
    .filter(({ f, index }) => filter === "all" || (f && verdicts[index] !== "dismissed" && (filter === "flagged" || (f.rule.confidence === "review" && !verdicts[index]))));

  function exportCsv() {
    const blob = new Blob([findingsCsv(findings, verdicts)], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "purification-audit.csv" });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (transactions.length === 0)
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void take(e.dataTransfer.files); }}
          className={`card flex cursor-pointer flex-col items-center justify-center px-6 py-16 text-center transition-colors ${dragging ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-dashed"}`}
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><ScanSearch className="size-7" /></span>
          <p className="mt-4 text-lg font-semibold">Drop your bank exports here</p>
          <p className="mt-1 max-w-md text-sm text-[var(--color-ink-soft)]">CSV, OFX, QFX, QIF or JSON, as many accounts and months as you like. Every transaction is screened on this device.</p>
          <span className="btn btn-primary mt-5"><FileSpreadsheet className="size-4" /> Choose files</span>
          <input type="file" multiple accept=".csv,.tsv,.txt,.ofx,.qfx,.qif,.json" className="sr-only" onChange={(e) => void take(e.target.files)} />
          {warnings.map((w) => <p key={w} className="mt-3 text-sm text-[var(--color-over)]">{w}</p>)}
        </label>
        <aside className="card p-5">
          <p className="font-semibold">What it looks for</p>
          <ul className="mt-3 space-y-3 text-sm">
            {[["Interest received", "Counted as income to give away"], ["Gambling and betting", "Winnings to give away, stakes to stop"], ["Interest paid", "Flagged for review"], ["Conventional insurance", "Flagged for review; scholars differ"], ["Alcohol", "Flagged for review"]].map(([a, b]) => (
              <li key={a}><p className="font-medium">{a}</p><p className="text-[var(--color-ink-soft)]">{b}</p></li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--color-rule)] pt-3 text-xs leading-relaxed text-[var(--color-ink-faint)]">It reads what the bank printed, not what a payment was for, so every finding can be confirmed or dismissed. It is a screening aid, not a ruling.</p>
        </aside>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Transactions screened" value={summary.scanned.toLocaleString()} />
        <Stat label="Income to purify" value={fmt(summary.toPurify)} tone="brand" />
        <Stat label="Spending flagged" value={fmt(summary.impermissibleSpending)} tone="over" />
        <Stat label="Waiting for your review" value={String(summary.awaitingReview)} tone="gold" />
      </div>

      {summary.toPurify > 0 && (
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]"><HandCoins className="size-5" /></span>
          <p className="min-w-0 flex-1 text-sm text-[var(--color-ink-soft)]">
            <strong className="text-[var(--color-ink)]">{fmt(summary.toPurify)}</strong> of income looks like interest or gambling winnings. The common view is to give it away to charity, not as zakat and not expecting reward. Ask your scholar how.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] p-4">
          <div className="flex gap-1 rounded-xl bg-[var(--color-wash)] p-1">
            {([["flagged", `Flagged (${summary.flagged})`], ["review", `To review (${summary.awaitingReview})`], ["all", `All (${transactions.length})`]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === id ? "bg-[var(--color-card)] shadow-[var(--surface-shadow)]" : "text-[var(--color-ink-soft)]"}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-ghost btn-sm cursor-pointer">
              Add files <input type="file" multiple accept=".csv,.tsv,.txt,.ofx,.qfx,.qif,.json" className="sr-only" onChange={(e) => void take(e.target.files)} />
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={findings.length === 0}><Download className="size-4" /> Export report</button>
          </div>
        </div>
        <p className="border-b border-[var(--color-rule)] px-4 py-2 text-xs text-[var(--color-ink-faint)]">From {files.join(", ")}</p>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--color-ink-soft)]">{filter === "review" ? "Nothing waiting for review." : "Nothing flagged in these transactions."}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {rows.slice(0, 500).map(({ t, index, f }) => (
              <li key={index} className="grid gap-2 p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)_9rem_auto] sm:items-center">
                <span className="text-xs text-[var(--color-ink-faint)]">{t.date ?? "no date"}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  {f && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`rounded-md px-1.5 py-0.5 font-semibold ${f.rule.confidence === "likely" ? "bg-[var(--color-over-soft)] text-[var(--color-over)]" : "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"}`}>{f.rule.label}</span>
                      <span className="text-[var(--color-ink-soft)]">{f.rule.advice}</span>
                    </p>
                  )}
                </div>
                <span className={`font-mono-nums text-sm sm:text-right ${t.amount > 0 ? "text-[var(--color-brand)]" : ""}`}>{t.amount > 0 ? "+" : "−"}{fmt(Math.abs(t.amount))}</span>
                {f ? (
                  <div className="flex gap-1.5">
                    <button type="button" aria-pressed={verdicts[index] === "confirmed"} onClick={() => setVerdicts((v) => ({ ...v, [index]: v[index] === "confirmed" ? undefined : "confirmed" }))}
                      className={`btn btn-sm ${verdicts[index] === "confirmed" ? "btn-primary" : "btn-ghost"}`}><Check className="size-4" /> Confirm</button>
                    <button type="button" aria-label="Not an issue" title="Not an issue" onClick={() => setVerdicts((v) => ({ ...v, [index]: "dismissed" }))} className="btn btn-ghost btn-sm"><X className="size-4" /></button>
                  </div>
                ) : <span />}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--color-ink-faint)]">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        This screens bank descriptions with keyword rules. It will miss things described vaguely and flag some things that are fine, which is why each finding waits for you. It is an aid for you and your scholar, not a ruling.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "brand" | "over" | "gold" }) {
  const color = tone === "brand" ? "var(--color-brand)" : tone === "over" ? "var(--color-over)" : tone === "gold" ? "var(--color-gold)" : "var(--color-ink)";
  return (
    <div className="card p-4">
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 font-mono-nums text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

/**
 * Business zakat by the trade-assets method: cash, receivables expected back
 * and stock at selling value, less liabilities due within the year, on a year
 * held. Fixed assets (premises, equipment, vehicles used in the business) are
 * not counted. Same arithmetic as the personal calculator (lib/zakat.ts).
 */
function BusinessZakat({ currency, symbol }: { currency: string; symbol: string }) {
  const fmt = (n: number) => formatIn(n, currency);
  const [cash, setCash] = usePersistentState("biz:cash", "");
  const [receivables, setReceivables] = usePersistentState("biz:receivables", "");
  const [stock, setStock] = usePersistentState("biz:stock", "");
  const [liabilities, setLiabilities] = usePersistentState("biz:liabilities", "");
  const [basis, setBasis] = usePersistentState<NisabBasis>("biz:basis", "silver");
  const [price, setPrice] = usePersistentState("biz:price", "");

  const result = computeZakat({
    assets: { cash: num(cash), savings: 0, preciousMetals: 0, receivables: num(receivables), tradeGoods: num(stock) },
    liabilities: { immediateDebts: num(liabilities) },
    nisabBasis: basis,
    goldPricePerGram: basis === "gold" ? num(price) : 0,
    silverPricePerGram: basis === "silver" ? num(price) : 0,
  });
  const priced = num(price) > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">The business&apos;s trade assets</h2>
        <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">On the business&apos;s zakat date. Premises, equipment and vehicles it uses are not counted; what it holds to sell is.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Cash and bank balances" prefix={symbol} value={cash} onChange={setCash} />
          <Field label="Receivables" hint="Owed by customers, likely to be paid" prefix={symbol} value={receivables} onChange={setReceivables} />
          <Field label="Stock for sale" hint="At what it would sell for today" prefix={symbol} value={stock} onChange={setStock} />
          <Field label="Liabilities due within the year" hint="Suppliers, wages, taxes, loan instalments" prefix={symbol} value={liabilities} onChange={setLiabilities} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Nisab</p>
            <div className="mt-1.5 flex gap-1 rounded-xl bg-[var(--color-wash)] p-1">
              {(["silver", "gold"] as const).map((b) => (
                <button key={b} type="button" onClick={() => setBasis(b)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize ${basis === b ? "bg-[var(--color-card)] shadow-[var(--surface-shadow)]" : "text-[var(--color-ink-soft)]"}`}>
                  {b} ({b === "silver" ? NISAB_SILVER_GRAMS : NISAB_GOLD_GRAMS}g)
                </button>
              ))}
            </div>
          </div>
          <Field label={`Today's ${basis} price`} prefix={symbol} suffix="per gram" value={price} onChange={setPrice} />
        </div>
      </section>
      <aside className="card overflow-hidden lg:sticky lg:top-24">
        <div className={`px-5 py-3 text-sm font-semibold sm:px-6 ${!priced ? "bg-[var(--color-wash)] text-[var(--color-ink-soft)]" : result.meetsNisab ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"}`}>
          {!priced ? "The business's zakat" : result.meetsNisab ? "Zakat is due" : "Below nisab: no zakat due"}
        </div>
        <div className="p-5 sm:p-6">
          <p className="eyebrow">Zakat due</p>
          <p className="mt-3 font-mono-nums text-4xl font-semibold leading-tight">{priced ? fmt(result.zakatDue) : "—"}</p>
          <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{priced ? (result.meetsNisab ? `2.5% of ${fmt(result.netWealth)} net trade assets` : `${fmt(result.shortfall)} below the threshold`) : `Enter today's ${basis} price to see it.`}</p>
          {priced && <div className="mt-5"><Meter ratio={result.nisabValue > 0 ? result.netWealth / result.nisabValue : 0} met={result.meetsNisab} /></div>}
          <dl className="mt-5 space-y-1.5 border-t border-[var(--color-rule)] pt-4 text-sm">
            {[["Trade assets", fmt(result.totalAssets)], ["Less liabilities due", `− ${fmt(num(liabilities))}`], ["Net", fmt(result.netWealth)], ["Nisab", fmt(result.nisabValue)]].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-4"><dt className="text-[var(--color-ink-soft)]">{l}</dt><dd className="font-mono-nums">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-faint)]">Owners of a business sometimes pay its zakat themselves instead; check how yours is set up. Any income to purify from the audit is separate from zakat.</p>
        </div>
      </aside>
    </div>
  );
}
