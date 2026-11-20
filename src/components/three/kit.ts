import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

/* ------------------------------------------------------------------
   EDS 3D kit — everything is modelled procedurally, so there are no
   heavy assets to download: a molar built from a signed-distance field
   (marching cubes) and stainless instruments built from lathes and
   tapered tubes, lit by a PMREM studio environment.
------------------------------------------------------------------- */

export type Kind = "mirror" | "explorer" | "probe" | "excavator" | "scaler" | "forceps" | "tweezers" | "handpiece" | "carver";

export function createRenderer(canvas: HTMLCanvasElement, maxDpr = 2) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.setClearColor(0x000000, 0);
  return r;
}

export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return env;
}

export function addStudioLights(scene: THREE.Scene, dark = false) {
  const key = new THREE.DirectionalLight(0xffffff, dark ? 2.6 : 2.2);
  key.position.set(5, 7, 8);
  const rim = new THREE.DirectionalLight(0x65c2c7, dark ? 3.2 : 1.6);
  rim.position.set(-7, 2, -6);
  const back = new THREE.DirectionalLight(0xbfe6ea, dark ? 1.6 : 0.8);
  back.position.set(4, -3, -7);
  const hemi = new THREE.HemisphereLight(0xffffff, dark ? 0x0a2c52 : 0xdcefef, dark ? 0.35 : 0.7);
  scene.add(key, rim, back, hemi);
}

// ---------------- materials ----------------
export function makeMaterials(dark = false) {
  const env = dark ? 1.35 : 1.15;
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0xd2d9df, metalness: 1, roughness: 0.2, envMapIntensity: env }),
    satin: new THREE.MeshStandardMaterial({ color: 0xbcc5cd, metalness: 1, roughness: 0.36, envMapIntensity: env }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, envMapIntensity: 1.6 }),
    grip: new THREE.MeshPhysicalMaterial({ color: 0x5fbfc4, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    navy: new THREE.MeshPhysicalMaterial({ color: 0x0a3f72, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9b469, metalness: 1, roughness: 0.28, envMapIntensity: env }),
    mark: new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.6, roughness: 0.35 }),
  };
}
export type Mats = ReturnType<typeof makeMaterials>;

// ---------------- geometry helpers ----------------
const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
const V3 = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

/** A tube whose radius tapers from r0 to r1 along the curve, with rounded ends. */
function taperTube(points: THREE.Vector3[], r0: number, r1: number, segs = 64, radial = 18, ease = (t: number) => t) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    const r = r0 + (r1 - r0) * ease(t);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const s = Math.sin(v), c = -Math.cos(v);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z).normalize();
      pos.push(P.x + r * N.x, P.y + r * N.y, P.z + r * N.z);
      nor.push(N.x, N.y, N.z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = (radial + 1) * i + j, b2 = (radial + 1) * (i + 1) + j;
      idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return { geometry: g, curve };
}

function capSphere(at: THREE.Vector3, r: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
  m.position.copy(at);
  return m;
}

function tube(points: THREE.Vector3[], r0: number, r1: number, mat: THREE.Material, flattenZ = 1) {
  const { geometry, curve } = taperTube(points, r0, r1);
  if (flattenZ !== 1) geometry.scale(1, 1, flattenZ);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geometry, mat));
  const end = curve.getPointAt(1);
  end.z *= flattenZ;
  g.add(capSphere(end, Math.max(r1, 0.002), mat));
  return { group: g, curve };
}

/** Knurled stainless handle (lathe), centred on the origin along +Y. */
function knurledHandle(mats: Mats, len = 1.5, r = 0.068) {
  const h = len / 2;
  const pts = [V2(0.0001, -h - 0.015), V2(r * 0.5, -h), V2(r * 0.86, -h + 0.05), V2(r * 0.95, -h + 0.09)];
  for (let y = -h + 0.11; y < h - 0.3; y += 0.026) {
    pts.push(V2(r, y), V2(r * 0.91, y + 0.013));
  }
  pts.push(V2(r, h - 0.28), V2(r * 0.97, h - 0.16), V2(r * 0.66, h - 0.05), V2(r * 0.4, h), V2(0.0001, h + 0.004));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mats.satin);
}

/** Resin handle with a turquoise silicone grip (EDS colours). */
function gripHandle(mats: Mats, len = 1.5) {
  const h = len / 2;
  const g = new THREE.Group();
  const core = [V2(0.0001, -h - 0.01), V2(0.05, -h), V2(0.062, -h + 0.08), V2(0.062, h - 0.2), V2(0.05, h - 0.08), V2(0.03, h), V2(0.0001, h + 0.004)];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(core, 36), mats.steel));
  const grip: THREE.Vector2[] = [V2(0.06, -h + 0.12), V2(0.08, -h + 0.18)];
  for (let y = -h + 0.22; y < h - 0.32; y += 0.06) grip.push(V2(0.082, y), V2(0.077, y + 0.03));
  grip.push(V2(0.08, h - 0.3), V2(0.06, h - 0.24));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(grip, 40), mats.grip));
  return g;
}

// ---------------- instruments ----------------
type Built = THREE.Group & { userData: { tip?: THREE.Vector3; tipDir?: THREE.Vector3 } };

function wrap(inner: THREE.Object3D, offsetY = -0.3): Built {
  const g = new THREE.Group() as Built;
  inner.position.y = offsetY;
  g.add(inner);
  return g;
}

function mirror(m: Mats) {
  const g = new THREE.Group();
  g.add(gripHandle(m));
  g.add(tube([V3(0, 0.74), V3(0, 1.0), V3(0, 1.22), V3(0, 1.32, 0.02)], 0.026, 0.018, m.steel).group);
  const head = new THREE.Group();
  const rim = new THREE.CylinderGeometry(0.165, 0.165, 0.036, 64);
  rim.rotateX(Math.PI / 2);
  head.add(new THREE.Mesh(rim, m.steel));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 64), m.mirror);
  face.position.z = 0.0185;
  head.add(face);
  head.position.set(0, 1.46, 0.06);
  head.rotation.x = -0.42;
  g.add(head);
  return wrap(g);
}

function explorer(m: Mats) {
  const g = new THREE.Group();
  g.add(knurledHandle(m));
  g.add(tube([V3(0, 0.74), V3(0, 1.04), V3(0, 1.2), V3(0.04, 1.32), V3(0.13, 1.37), V3(0.19, 1.31), V3(0.17, 1.21)], 0.026, 0.0035, m.steel).group);
  g.add(tube([V3(0, -0.74), V3(0, -1.0), V3(0.01, -1.12), V3(0.07, -1.2), V3(0.16, -1.24)], 0.026, 0.0035, m.steel).group);
  return wrap(g, 0);
}

function probe(m: Mats) {
  const g = new THREE.Group();
  g.add(knurledHandle(m));
  const { group, curve } = tube([V3(0, 0.74), V3(0, 1.08), V3(0, 1.18), V3(0.05, 1.26), V3(0.15, 1.29), V3(0.44, 1.31)], 0.026, 0.009, m.steel);
  g.add(group);
  // millimetre bands near the tip
  for (const t of [0.78, 0.86, 0.94]) {
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.026, 16), m.mark);
    band.position.copy(p);
    band.quaternion.setFromUnitVectors(V3(0, 1, 0), tan);
    g.add(band);
  }
  return wrap(g);
}

function excavator(m: Mats) {
  const g = new THREE.Group();
  g.add(gripHandle(m));
  const { group, curve } = tube([V3(0, 0.74), V3(0, 1.1), V3(0.02, 1.24), V3(0.1, 1.33), V3(0.18, 1.31)], 0.024, 0.012, m.steel);
  g.add(group);
  const spoon = new THREE.Mesh(new THREE.SphereGeometry(0.042, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.steel);
  spoon.scale.set(1, 0.4, 1.3);
  spoon.position.copy(curve.getPointAt(1));
  spoon.quaternion.setFromUnitVectors(V3(0, 1, 0), curve.getTangentAt(1).negate());
  g.add(spoon);
  return wrap(g);
}

function scaler(m: Mats) {
  const g = new THREE.Group();
  g.add(knurledHandle(m));
  g.add(tube([V3(0, 0.74), V3(0, 1.06), V3(0.03, 1.2), V3(0.12, 1.31), V3(0.21, 1.35), V3(0.27, 1.3)], 0.026, 0.004, m.steel, 0.6).group);
  g.add(tube([V3(0, -0.74), V3(0, -1.06), V3(-0.03, -1.2), V3(-0.12, -1.31), V3(-0.21, -1.35), V3(-0.27, -1.3)], 0.026, 0.004, m.steel, 0.6).group);
  return wrap(g, 0);
}

function carver(m: Mats) {
  const g = new THREE.Group();
  g.add(knurledHandle(m, 1.4));
  const blade = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), m.steel);
  blade.scale.set(0.55, 1.9, 0.16);
  blade.position.set(0, 0.98, 0);
  g.add(tube([V3(0, 0.7), V3(0, 0.84)], 0.024, 0.02, m.steel).group, blade);
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), m.steel);
  disc.scale.set(1, 1, 0.18);
  disc.position.set(0, -0.92, 0);
  g.add(tube([V3(0, -0.7), V3(0, -0.84)], 0.024, 0.02, m.steel).group, disc);
  return wrap(g, 0);
}

function forceps(m: Mats) {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(tube([V3(0.17 * s, -1.25), V3(0.14 * s, -0.7), V3(0.08 * s, 0.05), V3(0.025 * s, 0.42)], 0.05, 0.04, m.satin, 0.55).group);
    g.add(tube([V3(0.025 * s, 0.42), V3(0.055 * s, 0.62), V3(0.05 * s, 0.82), V3(0.016 * s, 0.98)], 0.042, 0.02, m.steel, 0.7).group);
  }
  const hinge = new THREE.CylinderGeometry(0.07, 0.07, 0.07, 32);
  hinge.rotateX(Math.PI / 2);
  const h = new THREE.Mesh(hinge, m.steel);
  h.position.y = 0.44;
  g.add(h);
  return wrap(g, 0.1);
}

function tweezers(m: Mats) {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(tube([V3(0.012 * s, 1.0), V3(0.05 * s, 0.6), V3(0.075 * s, -0.1), V3(0.05 * s, -0.55, 0.04), V3(0.012 * s, -0.88, 0.14)], 0.034, 0.012, m.steel, 0.4).group);
  }
  g.add(capSphere(V3(0, 1.0), 0.03, m.steel));
  return wrap(g, 0);
}

function handpiece(m: Mats) {
  const g = new THREE.Group();
  const pts = [V2(0.0001, -1.22), V2(0.07, -1.22), V2(0.09, -1.17), V2(0.09, -0.96), V2(0.082, -0.93), V2(0.086, -0.6), V2(0.08, -0.2), V2(0.075, 0.18)];
  for (let y = 0.2; y < 0.56; y += 0.04) pts.push(V2(0.074, y), V2(0.068, y + 0.02));
  pts.push(V2(0.066, 0.6), V2(0.056, 0.8), V2(0.05, 0.96), V2(0.04, 1.0), V2(0.0001, 1.01));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), m.satin));
  const ring = (y: number, mat: THREE.Material, r = 0.0915) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.035, 48), mat);
    c.position.y = y;
    g.add(c);
  };
  ring(-1.02, m.navy);
  ring(-0.88, m.grip, 0.088);
  const headGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 48);
  headGeo.rotateX(Math.PI / 2);
  const head = new THREE.Mesh(headGeo, m.steel);
  head.position.set(0, 1.07, 0);
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.steel);
  cap.scale.set(1, 0.25, 1);
  cap.rotation.x = -Math.PI / 2;
  cap.position.set(0, 1.07, -0.075);
  g.add(cap);
  const burGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.19, 16);
  burGeo.rotateX(Math.PI / 2);
  const bur = new THREE.Mesh(burGeo, m.steel);
  bur.position.set(0, 1.07, 0.17);
  g.add(bur);
  const diamond = new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 12), m.gold);
  diamond.scale.set(1, 1, 1.6);
  diamond.position.set(0, 1.07, 0.27);
  g.add(diamond);
  const w = wrap(g, -0.2);
  w.userData.tip = V3(0, 1.07 - 0.2, 0.29);
  w.userData.tipDir = V3(0, 0, 1);
  return w;
}

export function buildInstrument(kind: Kind, mats: Mats): Built {
  switch (kind) {
    case "mirror": return mirror(mats);
    case "explorer": return explorer(mats);
    case "probe": return probe(mats);
    case "excavator": return excavator(mats);
    case "scaler": return scaler(mats);
    case "forceps": return forceps(mats);
    case "tweezers": return tweezers(mats);
    case "handpiece": return handpiece(mats);
    case "carver": return carver(mats);
  }
}

// ---------------- the molar ----------------
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
function sdEllipsoid(x: number, y: number, z: number, a: number, b: number, c: number) {
  const k0 = Math.hypot(x / a, y / b, z / c);
  const k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c));
  return (k0 * (k0 - 1)) / k1;
}
function sdRoundCone(px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r1: number, r2: number) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
const sdCapsule = (px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number) =>
  sdRoundCone(px, py, pz, ax, ay, az, bx, by, bz, r, r);

/** Lower first molar: four cusps, central fissures, cervical neck, two roots. */
export function toothSDF(x: number, y: number, z: number) {
  let d = sdEllipsoid(x, y - 0.3, z, 0.54, 0.3, 0.45);
  const cusps: [number, number, number][] = [[0.23, 0.18, 0.2], [-0.23, 0.17, 0.19], [0.24, -0.17, 0.19], [-0.21, -0.18, 0.18], [0.0, 0.24, 0.15]];
  for (const [cx, cz, r] of cusps) d = smin(d, Math.hypot(x - cx, y - 0.5, z - cz) - r, 0.17);
  // occlusal fissures
  d = smax(d, -sdCapsule(x, y, z, -0.36, 0.68, 0.0, 0.36, 0.68, 0.0, 0.045), 0.07);
  d = smax(d, -sdCapsule(x, y, z, 0.0, 0.69, -0.3, 0.0, 0.69, 0.3, 0.038), 0.06);
  // cervical neck & root trunk
  d = smin(d, sdRoundCone(x, y, z, 0, 0.12, 0, 0, -0.16, 0, 0.43, 0.36), 0.16);
  // roots (broad bucco-lingually)
  const zr = z * 0.78;
  d = smin(d, sdRoundCone(x, y, zr, 0.21, -0.06, 0, 0.29, -0.86, 0.03, 0.19, 0.055), 0.13);
  d = smin(d, sdRoundCone(x, y, zr, -0.21, -0.06, 0, -0.31, -0.8, -0.02, 0.18, 0.055), 0.13);
  // a little organic irregularity
  d += 0.005 * Math.sin(x * 9.1) * Math.sin(y * 11.3) * Math.sin(z * 7.7);
  return d;
}

function sdfNormal(p: THREE.Vector3) {
  const e = 0.002;
  return V3(
    toothSDF(p.x + e, p.y, p.z) - toothSDF(p.x - e, p.y, p.z),
    toothSDF(p.x, p.y + e, p.z) - toothSDF(p.x, p.y - e, p.z),
    toothSDF(p.x, p.y, p.z + e) - toothSDF(p.x, p.y, p.z - e),
  ).normalize();
}

/** Point on the surface in the direction `dir` from `origin` (sphere tracing). */
function surfacePoint(origin: THREE.Vector3, dir: THREE.Vector3) {
  const d = dir.clone().normalize();
  const p = origin.clone().addScaledVector(d, 1.4);
  for (let i = 0; i < 80; i++) {
    const s = toothSDF(p.x, p.y, p.z);
    if (Math.abs(s) < 0.0008) break;
    p.addScaledVector(d, -s * 0.9);
  }
  return p;
}

export type ToothUniforms = {
  uSpot: { value: THREE.Vector3 };
  uDecay: { value: number };
  uSweep: { value: number };
  uSweepAmt: { value: number };
  uWork: { value: number };
};

export function makeToothMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xeee6d6, roughness: 0.34, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.18,
    sheen: 0.45, sheenColor: new THREE.Color(0xfff1dc), sheenRoughness: 0.5, envMapIntensity: 0.7,
  });
  const uniforms: ToothUniforms = {
    uSpot: { value: V3(0, 0.6, 0.3) }, uDecay: { value: 1 }, uSweep: { value: -2 }, uSweepAmt: { value: 0 }, uWork: { value: 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vLocal;
         uniform vec3 uSpot; uniform float uDecay; uniform float uSweep; uniform float uSweepAmt; uniform float uWork;
         float h3(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
         float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
           return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                      mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
         float decayMask(){
           float d = distance(vLocal, uSpot);
           float n = n3(vLocal*38.0)*0.6 + n3(vLocal*90.0)*0.4;
           float r = 0.15 * uDecay;
           return (1.0 - smoothstep(r*0.55, r, d + (n-0.5)*0.07*uDecay)) * step(0.001, uDecay);
         }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float dm = decayMask();
         float core = 1.0 - smoothstep(0.0, 0.09*uDecay + 0.0001, distance(vLocal, uSpot));
         vec3 decayCol = mix(vec3(0.42,0.29,0.16), vec3(0.12,0.08,0.05), core);
         diffuseColor.rgb = mix(diffuseColor.rgb, decayCol, dm);
         float ring = smoothstep(0.03, 0.0, abs(distance(vLocal, uSpot) - 0.15*uDecay)) * uWork;
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0,0.98,0.94), ring*0.5);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(roughnessFactor, 0.9, dm);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float s = dot(vLocal, normalize(vec3(0.8, 0.55, 0.2)));
         float band = exp(-pow((s - uSweep) * 7.0, 2.0));
         totalEmissiveRadiance += vec3(0.72, 0.95, 0.97) * band * 0.55 * uSweepAmt;`,
      );
  };
  return { mat, uniforms };
}

/** Builds the molar mesh (marching cubes over the SDF) and finds the decay spot. */
export function buildTooth(material: THREE.Material, res = 72) {
  const mc = new MarchingCubes(res, material, false, false, 120000);
  mc.isolation = 0;
  const half = res / 2;
  const f = mc.field;
  for (let z = 0; z < res; z++) {
    const pz = (z - half) / half;
    for (let y = 0; y < res; y++) {
      const py = (y - half) / half;
      for (let x = 0; x < res; x++) {
        const px = (x - half) / half;
        f[x + y * res + z * res * res] = -toothSDF(px, py, pz);
      }
    }
  }
  mc.update();
  mc.frustumCulled = false;
  const spot = surfacePoint(V3(0, 0.42, 0), V3(0.3, 0.62, 0.72));
  const normal = sdfNormal(spot);
  return { mesh: mc as unknown as THREE.Mesh, spot, normal };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
}
