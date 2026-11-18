"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/motion-tokens";

/**
 * How far net wealth sits from the nisab threshold, as a bar rather than
 * just the two figures in the table below it. The fill is a spring, not a
 * tween, so it has a little weight to it — numbers in a calculator like
 * this should feel like they settled, not like they snapped into place.
 */
export function Meter({ ratio, met }: { ratio: number; met: boolean }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Net wealth against the nisab threshold"
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-rule)]"
    >
      <motion.div
        className={`h-full rounded-full ${met ? "bg-[var(--color-brand)]" : "bg-[var(--color-gold)]"}`}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={springs.value}
      />
    </div>
  );
}
