import Link from "next/link";
import { Mark } from "@/components/Mark";

/** The mark and the name, linking home. */
export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`flex shrink-0 items-center gap-2 ${className}`} aria-label="Zakat Kit home">
      <Mark className="size-9" />
      <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
        Zakat <span className="text-[var(--color-brand)]">Kit</span>
      </span>
    </Link>
  );
}
