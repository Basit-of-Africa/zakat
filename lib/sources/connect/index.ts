/**
 * Every connector in one list, so the interface can render what is available
 * and say plainly why the rest is not.
 *
 * Showing an unavailable connector with its reason, rather than hiding it, is
 * deliberate. "Connect a bank account" missing from the page looks like the
 * feature does not exist; the same row greyed out with "not configured on
 * this copy, upload a statement instead" tells the student what to do next.
 */

export type { Connector, ConnectorStatus } from "@/lib/sources/connect/types";
export { ConnectorError } from "@/lib/sources/connect/types";

import { bankConnector } from "@/lib/sources/connect/bank";
import { evmConnector } from "@/lib/sources/connect/evm";
import type { Connector } from "@/lib/sources/connect/types";

export const CONNECTORS: readonly Connector[] = [evmConnector, bankConnector];
