/**
 * One house curve, three durations. Used everywhere motion appears so the
 * whole app moves like one thing rather than a collage of components that
 * each picked their own feel.
 */

export const ease = {
  /** Soft start, long landing. The default for anything that settles. */
  house: [0.4, 0, 0.05, 1] as const,
  /** Expo-ish out. Reveals, things entering the screen. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Symmetric. Things that move from one on-screen state to another. */
  inOut: [0.77, 0, 0.175, 1] as const,
};

export const dur = {
  /** Micro-interactions: toggles, button presses, hovers. */
  fast: 0.2,
  /** Ordinary UI motion: panels, cards, warnings appearing. */
  base: 0.35,
  /** First-load reveals and the one signature moment per screen. */
  slow: 0.6,
};

export const springs = {
  /** Snappy, slightly bouncy — buttons, toggles, the tab pill. */
  ui: { type: "spring", duration: 0.45, bounce: 0.2 } as const,
  /** Heavier, no bounce — numbers, the threshold meter filling. */
  value: { type: "spring", duration: 0.7, bounce: 0 } as const,
};

export const stagger = {
  list: 0.045,
};
