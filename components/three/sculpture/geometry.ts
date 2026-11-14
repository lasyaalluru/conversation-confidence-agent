import * as THREE from "three";
import type { SculptureMaterials } from "./materials";

/**
 * The Conversation Sculpture — four procedural layers, one for each part of the confidence gap:
 *   0 · Knowing the words      → brushed champagne ring with a polished edge ring
 *   1 · Finding the words      → lavender glass trefoil ribbon (thought searching for form)
 *   2 · Expressing the thought → sage satin sound-wave ring
 *   3 · Speaking confidently   → luminous glass core that sends out ripples
 * Everything is built from code — no downloaded models.
 */

export interface Layer {
  id: "knowing" | "finding" | "expressing" | "speaking";
  group: THREE.Group;
  /** Lift direction for the exploded view. */
  lift: THREE.Vector3;
  /** Exploded-view order: high-order parts leave first and come back last. */
  order: number;
  /** How much this layer expands on CTA focus. */
  spread: number;
}

export interface SculptureParts {
  root: THREE.Group;
  layers: Layer[];
  ripples: THREE.Mesh[];
  coreGlow: THREE.Mesh;
  particles: THREE.Points;
}

export function buildSculpture(m: SculptureMaterials, detail: number, particleCount: number): SculptureParts {
  const root = new THREE.Group();
  const seg = (n: number) => Math.max(8, Math.round(n * detail));

  // 0 · Knowing the words — brushed ring + polished edge ring
  const knowing = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.03, seg(32), seg(320)), m.champagneMetal);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.009, seg(12), seg(320)), m.polishedMetal);
  edge.rotation.set(0.08, 0.12, 0);
  knowing.add(ring, edge);

  // 1 · Finding the words — glass trefoil ribbon
  const finding = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.98, 0.075, seg(420), seg(40), 2, 3), m.lavenderGlass);
  finding.add(knot);

  // 2 · Expressing the thought — a sound wave wrapped into a ring
  const expressing = new THREE.Group();
  const wavePoints: THREE.Vector3[] = [];
  const N = 360;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // Amplitude envelope: louder on one side, like a phrase being spoken.
    const env = 0.35 + 0.65 * Math.pow(Math.sin(a / 2), 2);
    const y = Math.sin(a * 9) * 0.17 * env;
    const r = 1.3 + Math.cos(a * 9) * 0.025 * env;
    wavePoints.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const waveCurve = new THREE.CatmullRomCurve3(wavePoints, true, "centripetal");
  const wave = new THREE.Mesh(new THREE.TubeGeometry(waveCurve, seg(720), 0.028, seg(14), true), m.sageSatin);
  expressing.add(wave);

  // 3 · Speaking confidently — glass core with an inner light and outgoing ripples
  const speaking = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.44, seg(96), seg(64)), m.coreGlass);
  const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.1, seg(40), seg(24)), m.coreGlow);
  speaking.add(core, coreGlow);

  const ripples: THREE.Mesh[] = [];
  const rippleGeo = new THREE.TorusGeometry(0.5, 0.0045, 6, seg(200));
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(rippleGeo, m.ripple.clone());
    r.rotation.x = Math.PI / 2;
    speaking.add(r);
    ripples.push(r);
  }

  // Resting composition: rings at different angles, interlocking around the core.
  knowing.rotation.set(Math.PI / 2 - 0.15, 0, 0);
  finding.rotation.set(0.35, 0.2, 0);
  expressing.rotation.set(0.32, 0, -0.18);

  root.add(knowing, finding, expressing, speaking);

  // Atmospheric depth: a faint shell of "words in the air".
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const rad = 2.1 + Math.random() * 1.8;
    const s = Math.sqrt(1 - u * u);
    positions.set([Math.cos(t) * s * rad, u * rad * 0.7, Math.sin(t) * s * rad], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(pGeo, m.particles);

  const layers: Layer[] = [
    { id: "knowing", group: knowing, lift: new THREE.Vector3(0, 1.35, 0), order: 1, spread: 0.08 },
    { id: "finding", group: finding, lift: new THREE.Vector3(0, 0.45, 0), order: 0.7, spread: 0.06 },
    { id: "expressing", group: expressing, lift: new THREE.Vector3(0, -0.45, 0), order: 0.4, spread: 0.12 },
    { id: "speaking", group: speaking, lift: new THREE.Vector3(0, -1.35, 0), order: 0.1, spread: 0.04 },
  ];

  return { root, layers, ripples, coreGlow, particles };
}
