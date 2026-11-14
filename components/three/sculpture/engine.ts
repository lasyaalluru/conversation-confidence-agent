import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CUES, dampShot, easeInOutCubic, lerpShot, resolveShot, smoothstep, damp, type Shot } from "./cues";
import { buildSculpture, type SculptureParts } from "./geometry";
import { createMaterials, type SculptureMaterials } from "./materials";
import { buildStudioEnvironment } from "./studio";

/**
 * SculptureEngine — one class, one fixed canvas, fully controlled lifecycle (3D guide, step 02).
 *
 *  - One clock drives every moving part (guide step 08) so motion stays connected.
 *  - Scroll position picks the shot; the pose eases toward it every frame (step 06).
 *  - Cursor/touch tilt the object and rotate the studio reflections (step 05).
 *  - Post chain: MSAA → bloom (high threshold, glints only) → ACES tone mapping → grain (step 09).
 *  - Adaptive quality: steps DPR down, then grain/bloom/transmission off if FPS < 40.
 *  - Reduced motion: no animation loop — renders a single still frame per scroll/resize.
 */

export type QualityTier = 2 | 1 | 0; // high, medium, low

export interface EngineOptions {
  reducedMotion: boolean;
  onReady?: () => void;
  onFailure?: (reason: string) => void;
}

const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.035 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float n = rand(vUv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      c.rgb += n * uAmount;
      gl_FragColor = c;
    }`,
};

const BackdropShader = {
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vec2 p = vUv - 0.5;
      float d = length(p * vec2(1.0, 1.25));
      vec3 deep = vec3(0.0035, 0.0055, 0.014);       // midnight (linear)
      vec3 mid  = vec3(0.008, 0.011, 0.030);
      vec3 lav  = vec3(0.030, 0.022, 0.080);         // lavender haze
      vec3 col = mix(mid, deep, smoothstep(0.0, 0.6, d));
      col += lav * (1.0 - smoothstep(0.0, 0.42, length(p - vec2(0.12, 0.08)))) * 0.55;
      col += vec3(0.02, 0.05, 0.04) * (1.0 - smoothstep(0.0, 0.35, length(p - vec2(-0.25, -0.2)))) * 0.5;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

interface Holder {
  holder: THREE.Group;
  layer: SculptureParts["layers"][number];
  baseRotation: THREE.Euler;
}

export class SculptureEngine {
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private grain!: ShaderPass;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private materials!: SculptureMaterials;
  private parts!: SculptureParts;
  private holders: Holder[] = [];
  private backdrop!: THREE.Mesh;

  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private disposed = false;
  private stillFramePending = false;

  private anchors: { id: string; top: number }[] = [];
  private current: Shot = resolveShot(CUES[0], false);
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private focus = 0;
  private focusTarget = 0;
  private width = 1;
  private height = 1;
  private narrow = false;

  private tier: QualityTier = 2;
  private fpsFrames = 0;
  private fpsElapsed = 0;
  private sinceTierChange = 0;

  private resizeObserver?: ResizeObserver;
  private cleanup: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: EngineOptions,
  ) {}

  async init() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    this.tier = isTouch ? 1 : 2;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // MSAA happens in the composer's render target
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.setClearColor("#0b1020", 1);

    const onLost = (e: Event) => {
      e.preventDefault();
      this.stop();
      this.opts.onFailure?.("WebGL context lost");
    };
    this.canvas.addEventListener("webglcontextlost", onLost);
    this.cleanup.push(() => this.canvas.removeEventListener("webglcontextlost", onLost));

    // Scene
    this.scene.environment = buildStudioEnvironment(this.renderer);
    this.materials = createMaterials();
    this.parts = buildSculpture(this.materials, isTouch ? 0.6 : 1, isTouch ? 140 : 260);

    // Each layer sits in a holder: holders move apart (explode) in screen-up space and
    // carry the shared yaw/pitch, so exploded layers are all seen from the same angle.
    const root = this.parts.root;
    for (const layer of this.parts.layers) {
      const holder = new THREE.Group();
      root.remove(layer.group);
      holder.add(layer.group);
      root.add(holder);
      this.holders.push({ holder, layer, baseRotation: layer.group.rotation.clone() });
    }
    root.add(this.parts.particles);
    this.scene.add(root);

    // Backdrop rides with the camera so it always fills the frame.
    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShaderMaterial({ ...BackdropShader, depthWrite: false }),
    );
    this.backdrop.position.z = -40;
    this.camera.add(this.backdrop);
    this.scene.add(this.camera);

    // Post-processing
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.tier >= 1 ? 4 : 0 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.55, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grain = new ShaderPass(GrainShader);
    this.grain.enabled = this.tier === 2;
    this.composer.addPass(this.grain);

    this.resize();
    this.computeAnchors();
    this.current = this.targetShot();
    this.bindEvents();

    // Compile every shader before the first visible frame — no hitching (step 09).
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;

    this.update(0);
    this.composer.render();
    this.opts.onReady?.();

    if (this.opts.reducedMotion) return;
    this.start();
  }

  // ---------- public API ----------

  /** 0 → 1. CTA hover/focus: the sculpture glows and its layers expand. */
  setFocus(v: number) {
    this.focusTarget = v;
    if (this.opts.reducedMotion) {
      this.focus = v;
      this.requestStill();
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.cleanup.forEach((fn) => fn());
    this.resizeObserver?.disconnect();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.materials?.dispose();
    (this.scene.environment as THREE.Texture | null)?.dispose();
    this.bloom?.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }

  // ---------- loop ----------

  private start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.composer.render(dt);
    this.monitor(dt);
  };

  /** Reduced-motion mode: render one still frame on demand (scroll, resize, focus). */
  private requestStill() {
    if (!this.opts.reducedMotion || this.stillFramePending || this.disposed) return;
    this.stillFramePending = true;
    requestAnimationFrame(() => {
      this.stillFramePending = false;
      if (this.disposed) return;
      this.update(0);
      this.composer.render();
    });
  }

  // ---------- events ----------

  private bindEvents() {
    const onScroll = () => this.requestStill();
    const onPointer = (e: PointerEvent) => {
      this.pointer.tx = (e.clientX / this.width) * 2 - 1;
      this.pointer.ty = (e.clientY / this.height) * 2 - 1;
    };
    const onLeave = () => {
      this.pointer.tx = 0;
      this.pointer.ty = 0;
    };
    const onVisibility = () => {
      if (document.hidden) this.stop();
      else if (!this.opts.reducedMotion) this.start();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanup.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.computeAnchors();
      this.requestStill();
    });
    this.resizeObserver.observe(document.body);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === this.width && h === this.height && this.composer) return;
    this.width = w;
    this.height = h;
    this.narrow = w / h < 0.8;
    this.applyPixelRatio();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private applyPixelRatio() {
    const cap = this.tier === 2 ? 1.75 : this.tier === 1 ? 1.4 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(dpr);
    this.composer?.setPixelRatio(dpr);
  }

  /** Section positions (absolute tops) → scroll anchors. Re-run whenever layout changes. */
  private computeAnchors() {
    this.anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-cue]"))
      .map((el) => ({ id: el.dataset.cue!, top: el.getBoundingClientRect().top + window.scrollY }))
      .filter((a) => CUES.some((c) => c.id === a.id));
  }

  /**
   * A shot HOLDS while its section fills the screen, and the camera moves only while the next
   * section enters (its top travelling from the bottom of the viewport to 45% height).
   */
  private targetShot(): Shot {
    const y = window.scrollY;
    const vh = this.height;
    const shotFor = (id: string) => resolveShot(CUES.find((c) => c.id === id) ?? CUES[0], this.narrow);
    if (!this.anchors.length) return shotFor("hero");
    let i = 0;
    while (i < this.anchors.length - 1 && y >= this.anchors[i + 1].top - vh * 0.45) i++;
    const next = this.anchors[i + 1];
    if (!next) return shotFor(this.anchors[i].id);
    const t = smoothstep(0, 1, (y - (next.top - vh)) / (vh * 0.55));
    return lerpShot(shotFor(this.anchors[i].id), shotFor(next.id), t);
  }

  // ---------- per-frame pose ----------

  private update(dt: number) {
    const reduced = this.opts.reducedMotion;
    const target = this.targetShot();
    this.current = reduced || dt === 0 ? target : dampShot(this.current, target, 3.2, dt);
    const s = this.current;

    if (!reduced) {
      this.pointer.x = damp(this.pointer.x, this.pointer.tx, 3.5, dt);
      this.pointer.y = damp(this.pointer.y, this.pointer.ty, 3.5, dt);
      this.focus = damp(this.focus, this.focusTarget, 4.5, dt);
    }
    const px = reduced ? 0 : this.pointer.x;
    const py = reduced ? 0 : this.pointer.y;
    const t = this.time;

    // Frame by size: fit `s.fit` world units into the viewport's short side.
    const aspect = this.width / this.height;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = aspect >= 1 ? s.fit / 2 / tanHalf : s.fit / 2 / (tanHalf * aspect);
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);
    const visibleH = 2 * dist * tanHalf;
    const visibleW = visibleH * aspect;
    this.parts.root.position.set(s.offsetX * visibleW, s.offsetY * visibleH, 0);

    const yaw = s.yaw + px * 0.22;
    const pitch = s.pitch + py * 0.14;

    for (const { holder, layer, baseRotation } of this.holders) {
      // Staggered explode: high-order parts leave first and come back last (step 07).
      const delay = (1 - layer.order) * 0.42;
      const e = easeInOutCubic(Math.min(1, Math.max(0, (s.explode - delay) / 0.58)));
      holder.position.copy(layer.lift).multiplyScalar(e);
      holder.rotation.set(pitch, yaw, 0);
      holder.scale.setScalar(1 + layer.spread * this.focus);

      // Slow, independent drift — calm, never a fast spin.
      const g = layer.group;
      g.rotation.copy(baseRotation);
      if (layer.id === "knowing") g.rotation.z += t * 0.045;
      if (layer.id === "finding") g.rotation.y += t * 0.06 + Math.sin(t * 0.3) * 0.05;
      if (layer.id === "expressing") g.rotation.y -= t * 0.05;
    }

    // Breath + core light
    const breath = Math.sin(t * 1.2);
    const speaking = this.holders[3].layer.group;
    speaking.children[0].scale.setScalar(1 + breath * 0.025);
    this.parts.coreGlow.scale.setScalar(1 + breath * 0.07 + this.focus * 0.25);
    const glow = 0.5 + s.glow * 0.5 + this.focus * 0.75;
    this.materials.coreGlow.color.setRGB(1.25 * glow, 1.14 * glow, 0.98 * glow);
    this.bloom.strength = 0.12 + s.glow * 0.2 + this.focus * 0.32;

    // Voice ripples leaving the core
    this.parts.ripples.forEach((r, i) => {
      const phase = (t * 0.28 + i / 3) % 1;
      r.scale.setScalar(1 + phase * 2.8);
      const m = r.material as THREE.MeshBasicMaterial;
      m.opacity = reduced ? 0 : Math.pow(1 - phase, 2) * (0.12 + 0.3 * s.glow + 0.35 * this.focus);
    });

    this.parts.particles.rotation.y = yaw * 0.3 + t * 0.01;
    this.parts.particles.rotation.x = pitch * 0.2;

    this.renderer.toneMappingExposure = 0.92 * s.exposure;
    this.scene.environmentRotation.set(py * 0.3, -px * 0.8 + s.yaw * 0.12, 0);
    (this.grain.uniforms.uTime as { value: number }).value = t;
  }

  // ---------- adaptive quality ----------

  private monitor(dt: number) {
    this.fpsFrames++;
    this.fpsElapsed += dt;
    this.sinceTierChange += dt;
    if (this.fpsElapsed < 2) return;
    const fps = this.fpsFrames / this.fpsElapsed;
    this.fpsFrames = 0;
    this.fpsElapsed = 0;
    if (fps < 40 && this.tier > 0 && this.sinceTierChange > 3 && this.time > 3) {
      this.tier = (this.tier - 1) as QualityTier;
      this.sinceTierChange = 0;
      this.grain.enabled = false;
      if (this.tier === 0) {
        this.bloom.enabled = false;
        this.materials.setTransmission(false);
      }
      this.applyPixelRatio();
      this.composer.setSize(this.width, this.height);
    }
  }
}
