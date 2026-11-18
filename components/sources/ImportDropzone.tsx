"use client";

import { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { FileUp, ShieldCheck, TriangleAlert } from "lucide-react";
import { importStatementText, tooLarge } from "@/lib/sources/import";
import type { FinancialSource } from "@/lib/sources/types";
import { ease } from "@/lib/motion-tokens";

/**
 * Dropping statements in.
 *
 * Several files at once, because the student this is for has three accounts
 * and will have downloaded three files. Each one is read in the browser with
 * `file.text()` and parsed here; there is no upload, no endpoint, and nothing
 * to switch off. The sentence saying so is on the control itself rather than
 * in a privacy policy, because that is where somebody about to hand over a
 * bank statement is actually looking.
 *
 * The paste box exists for PDFs. A PDF cannot be read without sending it
 * somewhere to be converted, and rather than offer that, the app asks for the
 * table to be copied out — which works, costs the student ten seconds, and
 * keeps the promise.
 */
export function ImportDropzone({
  onImport,
  currency = "NGN",
}: {
  onImport: (sources: readonly FinancialSource[]) => void;
  /** What a statement that names no currency is assumed to be in: the home currency. */
  currency?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const pasteId = useId();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setRejected([]);

    const imported: FinancialSource[] = [];
    const refused: string[] = [];

    for (const file of Array.from(files)) {
      if (tooLarge(file)) {
        refused.push(`${file.name} is too large to be a statement.`);
        continue;
      }
      try {
        const text = await file.text();
        imported.push(importStatementText(text, { fileName: file.name, origin: "file", defaultCurrency: currency }));
      } catch {
        refused.push(`${file.name} could not be read.`);
      }
    }

    setRejected(refused);
    setBusy(false);
    if (imported.length > 0) onImport(imported);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handlePaste() {
    if (paste.trim() === "") return;
    onImport([importStatementText(paste, { origin: "paste", defaultCurrency: currency })]);
    setPaste("");
    setShowPaste(false);
  }

  return (
    <div className="space-y-2">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        animate={{
          scale: dragging ? 1.015 : 1,
          borderColor: dragging ? "var(--color-brand)" : "var(--color-rule)",
        }}
        transition={{ duration: 0.2, ease: ease.house }}
        className={`rounded-2xl border border-dashed p-5 text-center ${
          dragging ? "bg-[var(--color-brand-soft)]" : ""
        }`}
      >
        <motion.div
          animate={{ y: dragging ? -2 : 0 }}
          className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
        >
          <FileUp aria-hidden className="size-5" strokeWidth={1.8} />
        </motion.div>
        <p className="mt-3 text-sm">
          Drop your statements here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="tap font-medium text-[var(--color-brand)] underline underline-offset-2"
          >
            choose files
          </button>
          .
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-[var(--color-ink-soft)]">
          <ShieldCheck aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          CSV, OFX, QFX, QIF or JSON. Read on this device and never uploaded.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.tsv,.txt,.ofx,.qfx,.qif,.json"
          aria-label="Statement files"
          onChange={(e) => void handleFiles(e.target.files)}
          className="sr-only"
        />
        {busy && (
          <p className="mt-2 text-xs text-[var(--color-ink-soft)]" role="status">
            Reading...
          </p>
        )}
      </motion.div>

      {rejected.length > 0 && (
        <ul className="space-y-1 text-xs text-[var(--color-over)]">
          {rejected.map((message) => (
            <li key={message} className="flex items-start gap-1.5">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
              {message}
            </li>
          ))}
        </ul>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowPaste((open) => !open)}
          aria-expanded={showPaste}
          className="tap text-xs text-[var(--color-ink-soft)] underline underline-offset-2"
        >
          {showPaste ? "Hide the paste box" : "Only have a PDF? Paste the table instead"}
        </button>

        {showPaste && (
          <div className="mt-2">
            <label htmlFor={pasteId} className="text-sm font-medium">
              Paste the rows from your statement
            </label>
            <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
              Include the row of column headings if you can. Date, description and amount
              are enough; a balance column is better.
            </p>
            <textarea
              id={pasteId}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-xl border border-[var(--color-rule)] bg-[var(--surface)] p-2.5 text-sm outline-none transition-colors focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={paste.trim() === ""}
              className="tap mt-2 rounded-full border border-[var(--color-rule)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Read this
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
