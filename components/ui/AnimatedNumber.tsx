"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a number that tweens when it *changes*.
 *
 * The first render is the exact value. No count-up on mount. That keeps
 * server and client output identical (no hydration mismatch) and reserves
 * motion for what it should mean here: a figure just recalculated because
 * someone edited an input or moved a simulator slider.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 520,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutQuint, fast settle, no overshoot on currency.
      const eased = 1 - Math.pow(1 - t, 5);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
