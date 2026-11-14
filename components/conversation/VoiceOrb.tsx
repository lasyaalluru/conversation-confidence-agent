"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { VoiceStatus } from "@/hooks/useConversation";

/**
 * The practice-screen voice visualization — a simplified, 2D echo of the landing sculpture
 * (rings around a luminous core), drawn on a canvas for low cost while the mic is active.
 *
 *  idle         → slow breathing
 *  listening    → radius follows the REAL microphone level (Web Audio analyser);
 *                 if no level is available it shows a steady status pulse instead
 *  transcribing / thinking → coherent rotating arcs
 *  speaking     → pulses on actual word boundaries from speech synthesis
 *  error        → still, muted
 */
const PALETTE: Record<VoiceStatus, { core: string; glow: string; ring: string }> = {
  idle: { core: "#F8F2E6", glow: "186,172,247", ring: "233,214,184" },
  listening: { core: "#EFFAF5", glow: "167,220,203", ring: "167,220,203" },
  transcribing: { core: "#F1EEFF", glow: "186,172,247", ring: "186,172,247" },
  thinking: { core: "#F1EEFF", glow: "186,172,247", ring: "186,172,247" },
  speaking: { core: "#FFF8EC", glow: "233,214,184", ring: "233,214,184" },
  error: { core: "#E8E3DD", glow: "180,90,70", ring: "200,160,150" },
};

export function VoiceOrb({
  status,
  getLevel,
  lastBoundaryRef,
  className = "",
}: {
  status: VoiceStatus;
  getLevel: () => number | null;
  lastBoundaryRef: React.RefObject<number>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  const reduced = useReducedMotion();

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let level = 0;
    let t = 0;
    let last = performance.now();
    let size = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = rect.width;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) t += dt;
      const s = statusRef.current;
      const p = PALETTE[s];
      const c = size / 2;
      const base = size * 0.17;

      // Target "energy" for this frame, from real signals where we have them.
      let target = 0.12 + Math.sin(t * 1.3) * 0.04; // idle breath
      if (s === "listening") {
        const real = getLevel();
        target = real !== null ? 0.15 + real * 0.85 : 0.3 + Math.sin(t * 4) * 0.08;
      } else if (s === "speaking") {
        const since = (now - lastBoundaryRef.current) / 1000;
        target = 0.22 + Math.max(0, 0.45 - since * 1.6);
      } else if (s === "thinking" || s === "transcribing") {
        target = 0.2;
      } else if (s === "error") {
        target = 0.05;
      }
      level += (target - level) * (reduced ? 1 : Math.min(1, dt * 10));

      ctx.clearRect(0, 0, size, size);

      // Glow
      const glowR = base * (2.3 + level * 1.4);
      const g = ctx.createRadialGradient(c, c, base * 0.4, c, c, glowR);
      g.addColorStop(0, `rgba(${p.glow},0.55)`);
      g.addColorStop(0.45, `rgba(${p.glow},0.16)`);
      g.addColorStop(1, `rgba(${p.glow},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Rings (tilted ellipses, echoing the sculpture)
      const rings = [
        { r: 1.75, tilt: -0.35, squash: 0.36, speed: 0.12, alpha: 0.55 },
        { r: 1.45, tilt: 0.6, squash: 0.9, speed: -0.08, alpha: 0.32 },
        { r: 1.25, tilt: 1.2, squash: 0.28, speed: 0.1, alpha: 0.45 },
      ];
      ctx.lineWidth = 1.2;
      for (const ring of rings) {
        const rr = base * (ring.r + level * 0.35);
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(ring.tilt + t * ring.speed);
        ctx.scale(1, ring.squash);
        ctx.strokeStyle = `rgba(${p.ring},${ring.alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Processing: rotating arcs
      if (s === "thinking" || s === "transcribing") {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(t * 1.8);
        ctx.strokeStyle = `rgba(${p.ring},0.9)`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, base * 1.32, (i * Math.PI * 2) / 3, (i * Math.PI * 2) / 3 + 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Listening: ripple rings driven by level
      if (s === "listening") {
        for (let i = 0; i < 3; i++) {
          const phase = (t * 0.9 + i / 3) % 1;
          ctx.strokeStyle = `rgba(${p.ring},${(1 - phase) * 0.35 * (0.3 + level)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(c, c, base * (1 + phase * 1.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Core
      const coreR = base * (0.82 + level * 0.3);
      const cg = ctx.createRadialGradient(c - coreR * 0.3, c - coreR * 0.35, coreR * 0.1, c, c, coreR);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.55, p.core);
      cg.addColorStop(1, `rgba(${p.glow},0.6)`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(c, c, coreR, 0, Math.PI * 2);
      ctx.fill();

      if (!reduced && !document.hidden) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const onVisible = () => {
      if (!document.hidden && !reduced) {
        cancelAnimationFrame(raf);
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
    // In reduced-motion mode we redraw once per status change.
  }, [reduced, getLevel, lastBoundaryRef, reduced ? status : null]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} aria-hidden className={`aspect-square w-full ${className}`} />;
}
