/**
 * The front door for a statement: text in, a source out.
 *
 * Deliberately takes text rather than a `File`. Reading the file is three
 * lines of browser API and belongs in the component; everything interesting
 * that happens afterwards is pure and testable, and keeping the boundary here
 * is what lets the whole import path be covered by tests that run in Node.
 *
 * The file never leaves the browser. There is no upload endpoint in this
 * project for statements and there should not be one.
 */

import { parseStatement } from "@/lib/sources/statement/parse";
import { statementToSource } from "@/lib/sources/statement/balance";
import type { FinancialSource, Origin } from "@/lib/sources/types";
import { fnv1a } from "@/lib/sources/types";

export interface ImportOptions {
  readonly fileName?: string;
  readonly origin?: Origin;
  readonly defaultCurrency?: string;
  readonly category?: "cash" | "savings";
  readonly now?: Date;
}

export function importStatementText(
  text: string,
  options: ImportOptions = {}
): FinancialSource {
  const parsed = parseStatement(text, options.fileName, options.defaultCurrency ?? "NGN");

  return statementToSource(parsed, {
    category: options.category,
    now: options.now,
    provenance: {
      origin: options.origin ?? (options.fileName ? "file" : "paste"),
      fileName: options.fileName,
      // Hashing the content rather than the name: the same statement
      // downloaded twice gets two names from the browser and one hash, which
      // is the case the duplicate check needs to catch.
      contentHash: fnv1a(text.trim()),
      importedAt: (options.now ?? new Date()).toISOString(),
    },
  });
}

/** Reads a dropped file as text. Browser only; nothing is sent anywhere. */
export async function readFileText(file: File): Promise<string> {
  return file.text();
}

/** A rough guard so a dropped video does not become a parse attempt. */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

export function tooLarge(file: { size: number }): boolean {
  return file.size > MAX_IMPORT_BYTES;
}
