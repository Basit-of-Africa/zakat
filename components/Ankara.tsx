"use client";

import { useEffect, useRef } from "react";

/**
 * The Ankara pattern: a wax-print-style repeat of rings and diamonds in the
 * brand colours, drawn on a canvas so it is sharp at any size and costs no
 * image download. Purely decorative, so it is hidden from screen readers.
 */
export function Ankara({ className = "", size = 56 }: { className?: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const r = c.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(r.width * d));
      c.height = Math.max(1, Math.round(r.height * d));
      const x = c.getContext("2d");
      if (!x) return;
      x.scale(d, d);
      const s = size;
      const cols = ["#ff7a1a", "#ffd23f", "#10a39b", "#ffffff"];
      x.fillStyle = "#5b1f6b";
      x.fillRect(0, 0, r.width, r.height);
      for (let cy = -s / 2, j = 0; cy < r.height + s; cy += s, j++) {
        for (let cx = (j % 2) * (s / 2) - s, i = 0; cx < r.width + s; cx += s, i++) {
          const mx = cx + s / 2, my = cy + s / 2;
          x.fillStyle = cols[(i + j) % 3];
          x.beginPath(); x.arc(mx, my, s * 0.42, 0, Math.PI * 2); x.fill();
          x.fillStyle = "#5b1f6b";
          x.beginPath(); x.arc(mx, my, s * 0.27, 0, Math.PI * 2); x.fill();
          x.fillStyle = cols[(i + j + 1) % 4];
          x.beginPath(); x.moveTo(mx, my - s * 0.18); x.lineTo(mx + s * 0.18, my); x.lineTo(mx, my + s * 0.18); x.lineTo(mx - s * 0.18, my); x.closePath(); x.fill();
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [size]);

  return <canvas ref={ref} aria-hidden="true" className={`block ${className}`} />;
}
