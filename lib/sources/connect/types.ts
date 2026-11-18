/**
 * Live connections, and the one place in this project that touches a network.
 *
 * Read `CONTRIBUTING.md` before adding to this folder. The project's rule was
 * that nothing leaves the device, and everything else still honours it:
 * statements are parsed in the browser and never uploaded, prices are typed
 * in, nothing is stored. Connecting to a bank or reading a wallet balance
 * cannot be done that way, so these live behind an interface that is off
 * unless it has been deliberately configured, and every connector has to
 * state in `networkNote` exactly what leaves the device if it is used. That
 * sentence is shown to the student before they connect, not buried in a
 * privacy policy.
 *
 * The rest of `lib/` is pure functions. This folder is not, which is why the
 * parts worth testing — mapping a chain id to its ticker, reading an API
 * response into a source — are separate exported functions, and the parts
 * that talk to the outside world are thin enough to read in one go.
 */

import type { FinancialSource } from "@/lib/sources/types";

export interface ConnectorStatus {
  readonly available: boolean;
  /** Why not, in words a student can act on. Required when unavailable. */
  readonly reason?: string;
}

export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly kind: "wallet" | "bank";
  /** Exactly what leaves the device. Shown before the student connects. */
  readonly networkNote: string;
  status(): ConnectorStatus;
  /** Resolves to the accounts found, which may be more than one. */
  connect(): Promise<readonly FinancialSource[]>;
}

export class ConnectorError extends Error {
  constructor(
    message: string,
    /** True when trying again might work: a cancelled prompt, a timeout. */
    readonly retryable = false
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}
