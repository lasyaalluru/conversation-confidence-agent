"use client";

import { useEffect } from "react";

/**
 * Drives `.reveal` elements from scroll POSITION (sets --reveal 0→1), not IntersectionObserver
 * callbacks — observers can skip beats on heavy GPU frames (3D guide, lesson 04).
 */
export function ScrollReveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.style.setProperty("--reveal", "1"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        const t = Math.min(1, Math.max(0, (vh * 0.96 - top) / (vh * 0.28)));
        el.style.setProperty("--reveal", (t * t * (3 - 2 * t)).toFixed(3));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
}
