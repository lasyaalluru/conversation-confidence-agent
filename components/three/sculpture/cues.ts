/**
 * The camera script (3D guide, step 06): one shot per landing-page section.
 * Sections opt in with `data-cue="<id>"`. The engine blends between shots by scroll position,
 * then eases toward the result every frame.
 *
 * Shots are framed by SIZE, not distance: `fit` is how many world units should fill the
 * viewport's short side, so the same cue works on a phone and a monitor.
 */
export interface Shot {
  fit: number;
  /** Horizontal placement as a fraction of viewport width (−0.5 … 0.5). */
  offsetX: number;
  /** Vertical placement as a fraction of viewport height. */
  offsetY: number;
  /** Object rotation (radians). */
  yaw: number;
  pitch: number;
  /** 0 = assembled, 1 = fully exploded into four layers. */
  explode: number;
  /** Core light / bloom amount 0 … 1. */
  glow: number;
  /** Scene brightness multiplier (dim behind dense content). */
  exposure: number;
}

export interface Cue {
  id: string;
  shot: Shot;
  /** Overrides for narrow (portrait/phone) viewports. */
  narrow?: Partial<Shot>;
}

export const CUES: Cue[] = [
  {
    id: "hero",
    shot: { fit: 4.3, offsetX: 0.2, offsetY: 0, yaw: -0.35, pitch: 0.45, explode: 0, glow: 0.55, exposure: 1 },
    narrow: { fit: 6.4, offsetX: 0, offsetY: 0.3 },
  },
  {
    id: "gap",
    shot: { fit: 6.2, offsetX: -0.2, offsetY: 0, yaw: 0.3, pitch: 1.05, explode: 1, glow: 0.3, exposure: 1 },
    narrow: { fit: 8, offsetX: 0, offsetY: 0.12, exposure: 0.35 },
  },
  {
    id: "how",
    shot: { fit: 4.6, offsetX: 0.24, offsetY: 0, yaw: 1.7, pitch: 0.2, explode: 0.12, glow: 0.6, exposure: 1 },
    narrow: { fit: 5.5, offsetX: 0, offsetY: 0.2, exposure: 0.5 },
  },
  {
    id: "scenarios",
    shot: { fit: 8.5, offsetX: 0, offsetY: 0.05, yaw: 2.7, pitch: 0.65, explode: 0, glow: 0.25, exposure: 0.55 },
    narrow: { fit: 9, exposure: 0.4 },
  },
  {
    id: "journey",
    shot: { fit: 5.2, offsetX: -0.25, offsetY: 0, yaw: 3.5, pitch: 0.35, explode: 0, glow: 0.4, exposure: 0.9 },
    narrow: { fit: 7, offsetX: 0, offsetY: 0.22, exposure: 0.45 },
  },
  {
    id: "coaching",
    shot: { fit: 5.8, offsetX: 0.25, offsetY: 0, yaw: 4.4, pitch: 0.95, explode: 0.3, glow: 0.5, exposure: 0.9 },
    narrow: { fit: 7.5, offsetX: 0, offsetY: 0.22, exposure: 0.45 },
  },
  {
    id: "cta",
    shot: { fit: 5.4, offsetX: 0, offsetY: 0.2, yaw: Math.PI * 2 - 0.35, pitch: 0.45, explode: 0, glow: 1, exposure: 1 },
    narrow: { fit: 5.6, offsetY: 0.22 },
  },
];

export function resolveShot(cue: Cue, narrow: boolean): Shot {
  return narrow && cue.narrow ? { ...cue.shot, ...cue.narrow } : cue.shot;
}

export function lerpShot(a: Shot, b: Shot, t: number): Shot {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    fit: l(a.fit, b.fit),
    offsetX: l(a.offsetX, b.offsetX),
    offsetY: l(a.offsetY, b.offsetY),
    yaw: l(a.yaw, b.yaw),
    pitch: l(a.pitch, b.pitch),
    explode: l(a.explode, b.explode),
    glow: l(a.glow, b.glow),
    exposure: l(a.exposure, b.exposure),
  };
}

/** Frame-rate–independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function dampShot(cur: Shot, target: Shot, lambda: number, dt: number): Shot {
  return {
    fit: damp(cur.fit, target.fit, lambda, dt),
    offsetX: damp(cur.offsetX, target.offsetX, lambda, dt),
    offsetY: damp(cur.offsetY, target.offsetY, lambda, dt),
    yaw: damp(cur.yaw, target.yaw, lambda, dt),
    pitch: damp(cur.pitch, target.pitch, lambda, dt),
    explode: damp(cur.explode, target.explode, lambda, dt),
    glow: damp(cur.glow, target.glow, lambda, dt),
    exposure: damp(cur.exposure, target.exposure, lambda, dt),
  };
}

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
