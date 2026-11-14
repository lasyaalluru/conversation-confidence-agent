import * as THREE from "three";

/**
 * A tiny photo studio built inside a throwaway scene, then baked into a PMREM environment map.
 * Metal and glass are only as good as what they reflect — this is where the "expensive" look comes from.
 * (3D guide, step 05: dark room, one off-axis softbox, strip lights.)
 */
export function buildStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const studio = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];

  const roomGeo = new THREE.BoxGeometry(80, 80, 80);
  const roomMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#04060d"), side: THREE.BackSide });
  studio.add(new THREE.Mesh(roomGeo, roomMat));
  disposables.push(roomGeo, roomMat);

  const panel = (w: number, h: number, intensity: number, pos: [number, number, number], hex: string) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
    disposables.push(geo, mat);
  };

  panel(22, 14, 3.2, [-22, 20, 20], "#fff6e8"); // key softbox, warm, off-axis
  panel(2.4, 34, 7, [30, 4, 12], "#eef1ff"); // strip light — draws the edge line
  panel(2.4, 34, 3.6, [-28, -2, -14], "#c9bdff"); // lavender strip (back left)
  panel(12, 10, 2.2, [4, 12, -32], "#b4f0dc"); // sage rim from behind
  panel(36, 6, 0.55, [0, -28, 0], "#e9d6b8"); // champagne floor bounce

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(studio, 0.035);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return target.texture;
}
