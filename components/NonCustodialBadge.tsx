import { ShieldCheck } from "lucide-react";
import { BANK_PUBLIC_KEY } from "@/lib/sources/connect/bank";

/**
 * The one claim this app repeats until it is boring: nothing typed or
 * imported here goes anywhere. It sits in the header so it is read once on
 * arrival, and again wherever a student is about to hand over a statement
 * or a wallet address — the two moments that actually call for it.
 *
 * The wording checks itself. On any deployment without bank connections
 * configured — which is the default, and what somebody running this locally
 * gets — the claim is simply true: statements are parsed in the page, prices
 * are typed in, nothing is stored and nothing is sent. Where somebody has
 * configured connections, an unqualified "nothing leaves this device" would
 * be false, and a privacy badge that is false is worse than no badge. So it
 * narrows to the part that stays true either way.
 */
export function NonCustodialBadge({ className = "" }: { className?: string }) {
  const connectable = BANK_PUBLIC_KEY !== "";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--color-brand)] ${className}`}
    >
      <ShieldCheck aria-hidden className="size-3.5 breathe" strokeWidth={2.25} />
      {connectable
        ? "Your statements and figures never leave this device"
        : "Nothing you enter ever leaves this device"}
    </div>
  );
}
