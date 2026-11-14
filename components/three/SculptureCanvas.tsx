"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { StaticSculpture } from "./StaticSculpture";

function hasWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * The single, persistent 3D canvas behind the landing page.
 * (The four layers it separates into are named in the "confidence gap" section text.)
 * Any element with `data-sculpture-focus` makes the sculpture glow + expand on hover/focus.
 */
export function SculptureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasWebGL2()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check needs the browser
      setState("fallback");
      return;
    }

    let disposed = false;
    let engine: import("./sculpture/engine").SculptureEngine | null = null;

    // Load three.js only on the client, after first paint.
    void import("./sculpture/engine")
      .then(async ({ SculptureEngine }) => {
        if (disposed) return;
        engine = new SculptureEngine(canvas, {
          reducedMotion,
          onReady: () => !disposed && setState("ready"),
          onFailure: () => !disposed && setState("fallback"),
        });
        await engine.init();
      })
      .catch((err) => {
        console.warn("[sculpture] falling back to static version:", err);
        if (!disposed) setState("fallback");
      });

    const focusOf = (target: EventTarget | null) =>
      target instanceof Element && target.closest("[data-sculpture-focus]") ? 1 : 0;
    const onOver = (e: Event) => engine?.setFocus(focusOf(e.target));
    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onOver);

    return () => {
      disposed = true;
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onOver);
      engine?.dispose();
    };
  }, [reducedMotion]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-midnight">
        {state !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center md:justify-end md:pr-[8vw]">
            <StaticSculpture
              className={`w-[min(78vw,560px)] -translate-y-[12vh] transition-opacity duration-700 md:translate-y-0 ${
                state === "fallback" ? "opacity-100" : "opacity-40"
              }`}
            />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full transition-opacity duration-[1200ms] ease-out ${
            state === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

    </>
  );
}
