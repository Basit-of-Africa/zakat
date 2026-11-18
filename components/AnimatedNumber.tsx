"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { dur, ease } from "@/lib/motion-tokens";

/**
 * A figure that counts to its new value instead of jump-cutting to it.
 *
 * This is the one signature moment on the result card: every other change
 * on the page is quiet, but the number the student came here for moving
 * under their eyes is what makes the total feel computed rather than just
 * swapped in. Reduced motion gets the plain jump — the point is a cue, not
 * a requirement to watch it happen.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration: dur.slow,
      ease: ease.house,
      onUpdate: setDisplay,
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return <span className="font-mono-nums tabular-nums">{format(display)}</span>;
}
