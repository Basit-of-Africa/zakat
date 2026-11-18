"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/motion-tokens";

/**
 * A segmented control with one pill that slides between tabs rather than
 * three buttons that each light up on their own. `layoutId` is what makes
 * that read as one object moving: Motion measures where the pill was and
 * where it needs to be and animates the difference, so this component never
 * has to compute a position itself.
 */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-full border border-[var(--color-rule)] bg-[var(--surface)] p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className="tap relative flex-1 rounded-full px-3 py-2 text-sm font-medium"
        >
          {active === tab.id && (
            <motion.span
              layoutId="tab-pill"
              className="absolute inset-0 rounded-full bg-[var(--color-brand)]"
              style={{ zIndex: 0 }}
              transition={springs.ui}
            />
          )}
          <span
            className={`relative z-10 transition-colors duration-200 ${
              active === tab.id ? "text-white" : "text-[var(--color-ink-soft)]"
            }`}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
