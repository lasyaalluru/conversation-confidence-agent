import * as THREE from "three";

/** Brushed-metal roughness streaks, generated at boot (no texture files). */
function brushedRoughnessTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(120,120,120)";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * h;
    const v = 90 + Math.random() * 80;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`;
    ctx.lineWidth = Math.random() * 1.2;
    ctx.beginPath();
    const x = Math.random() * w;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + Math.random() * 220, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Soft round sprite for atmospheric particles. */
function dotTexture(): THREE.CanvasTexture {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

export interface SculptureMaterials {
  champagneMetal: THREE.MeshPhysicalMaterial;
  polishedMetal: THREE.MeshPhysicalMaterial;
  lavenderGlass: THREE.MeshPhysicalMaterial;
  sageSatin: THREE.MeshPhysicalMaterial;
  coreGlass: THREE.MeshPhysicalMaterial;
  coreGlow: THREE.MeshBasicMaterial;
  ripple: THREE.MeshBasicMaterial;
  particles: THREE.PointsMaterial;
  /** Swap glass between real transmission (expensive) and a cheap translucent fallback. */
  setTransmission(enabled: boolean): void;
  dispose(): void;
}

export function createMaterials(): SculptureMaterials {
  const brushed = brushedRoughnessTexture();
  const dot = dotTexture();

  // Satin face: on metal, colour is just the tint of the reflection (guide step 04).
  const champagneMetal = new THREE.MeshPhysicalMaterial({
    color: "#e9d6b8",
    metalness: 1,
    roughness: 0.34,
    roughnessMap: brushed,
    anisotropy: 0.85,
    envMapIntensity: 1.25,
  });

  // Polished edge: the contrast with satin is what reads as expensive.
  const polishedMetal = new THREE.MeshPhysicalMaterial({
    color: "#f6ecdc",
    metalness: 1,
    roughness: 0.07,
    envMapIntensity: 1.4,
  });

  const lavenderGlass = new THREE.MeshPhysicalMaterial({
    color: "#efeaff",
    metalness: 0,
    roughness: 0.16,
    transmission: 1,
    thickness: 0.5,
    ior: 1.45,
    attenuationColor: new THREE.Color("#c9bcff"),
    attenuationDistance: 2.4,
    // A faint inner luminance so the glass reads lavender against the dark backdrop.
    emissive: new THREE.Color("#6f5fd0"),
    emissiveIntensity: 0.32,
    iridescence: 0.45,
    iridescenceIOR: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.7,
  });

  const sageSatin = new THREE.MeshPhysicalMaterial({
    color: "#a7dccb",
    metalness: 0.15,
    roughness: 0.38,
    sheen: 1,
    sheenColor: new THREE.Color("#e3f7ef"),
    sheenRoughness: 0.35,
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1,
  });

  const coreGlass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 0.7,
    ior: 1.5,
    attenuationColor: new THREE.Color("#f3e6cf"),
    attenuationDistance: 3,
    iridescence: 0.55,
    iridescenceIOR: 1.35,
    dispersion: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.2,
  });

  // HDR (>1) colour so bloom picks up only the core — "glints only".
  const coreGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.1, 0.95) });

  const ripple = new THREE.MeshBasicMaterial({
    color: "#e9d6b8",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.PointsMaterial({
    color: "#e9d6b8",
    size: 0.03,
    map: dot,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const glass = [lavenderGlass, coreGlass];

  return {
    champagneMetal,
    polishedMetal,
    lavenderGlass,
    sageSatin,
    coreGlass,
    coreGlow,
    ripple,
    particles,
    setTransmission(enabled) {
      for (const m of glass) {
        m.transmission = enabled ? 1 : 0;
        m.transparent = !enabled;
        m.opacity = enabled ? 1 : 0.62;
        m.needsUpdate = true;
      }
    },
    dispose() {
      [champagneMetal, polishedMetal, lavenderGlass, sageSatin, coreGlass, coreGlow, ripple, particles].forEach((m) =>
        m.dispose(),
      );
      brushed.dispose();
      dot.dispose();
    },
  };
}
