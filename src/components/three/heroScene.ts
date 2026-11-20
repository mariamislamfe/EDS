import * as THREE from "three";
import {
  addStudioLights, buildInstrument, buildTooth, clamp01, createRenderer, disposeTree, easeInOut, easeOut,
  makeMaterials, makeToothMaterial, seg, smooth, studioEnvironment, type Kind,
} from "./kit";

/**
 * Shared, mutable state written by the page (GSAP / pointer) and read every
 * frame by the scene — no React re-renders involved.
 *   intro     0→1 over the load choreography
 *   progress  0→1 scroll progress through the pinned hero
 */
export type HeroState = { intro: number; progress: number; px: number; py: number; reduced: boolean };

type Slot = {
  kind: Kind; pos: [number, number, number]; rot: [number, number, number]; scale: number;
  amp: number; freq: number; phase: number; spin: number; orbit?: number; from: [number, number, number]; delay: number;
};

// Composition around the molar (units: the tooth is ~2.6 tall)
const SLOTS: Slot[] = [
  { kind: "mirror", pos: [-2.15, 1.25, -0.4], rot: [0.25, 0.2, 0.62], scale: 0.95, amp: 0.09, freq: 0.7, phase: 0.2, spin: 0.12, from: [-6, 3, 1], delay: 0.18 },
  { kind: "explorer", pos: [2.2, 1.35, -0.7], rot: [0.1, -0.3, -0.55], scale: 0.95, amp: 0.08, freq: 0.6, phase: 1.4, spin: -0.1, from: [6, 4, -1], delay: 0.26 },
  { kind: "forceps", pos: [-2.45, -1.05, -1.3], rot: [0.15, 0.5, 0.3], scale: 0.85, amp: 0.07, freq: 0.5, phase: 2.2, spin: 0, from: [-7, -3, -2], delay: 0.34 },
  { kind: "probe", pos: [2.05, -1.35, 0.4], rot: [0.0, 0.3, -2.35], scale: 0.9, amp: 0.1, freq: 0.8, phase: 0.9, spin: 0.15, orbit: 0.06, from: [6, -4, 2], delay: 0.42 },
  { kind: "excavator", pos: [-0.9, -2.15, 1.1], rot: [0.4, 0.0, 1.9], scale: 0.8, amp: 0.08, freq: 0.75, phase: 3.1, spin: 0.2, orbit: -0.05, from: [-2, -6, 3], delay: 0.5 },
  { kind: "scaler", pos: [0.5, 2.45, -1.6], rot: [0.2, 0.2, -1.2], scale: 0.85, amp: 0.07, freq: 0.55, phase: 4.0, spin: -0.08, from: [1, 6, -2], delay: 0.58 },
];
const HANDPIECE: Slot = { kind: "handpiece", pos: [1.55, 0.25, 1.2], rot: [-0.4, -0.9, -0.7], scale: 0.9, amp: 0.06, freq: 0.65, phase: 0.5, spin: 0, from: [7, 1, 3], delay: 0.66 };

export function mountHeroScene(canvas: HTMLCanvasElement, state: HeroState, onReady?: () => void) {
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const renderer = createRenderer(canvas, mobile ? 1.25 : 1.5);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  addStudioLights(scene);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  const root = new THREE.Group(); // pointer parallax
  const comp = new THREE.Group(); // composition placement (responsive)
  root.add(comp);
  scene.add(root);

  // ---- tooth ----
  const { mat: toothMat, uniforms } = makeToothMaterial();
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -2);
  toothMat.clippingPlanes = [clip];
  const { mesh: tooth, spot, normal: spotNormal } = buildTooth(toothMat, mobile ? 56 : 72);
  uniforms.uSpot.value.copy(spot);
  const toothPivot = new THREE.Group();
  tooth.scale.setScalar(1.85);
  toothPivot.add(tooth);
  comp.add(toothPivot);
  // the presentation angle that turns the decay towards the camera
  const faceY = -Math.atan2(spot.x, spot.z) + 0.38;

  // ---- dust from the drilling ----
  const DUST = 90;
  const dustPos = new Float32Array(DUST * 3);
  const dustVel = new Float32Array(DUST * 3);
  const dustLife = new Float32Array(DUST);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.018, transparent: true, opacity: 0.9, depthWrite: false }));
  tooth.add(dust);
  let dustCursor = 0;

  // ---- instruments ----
  const mats = makeMaterials(false);
  const instruments = (mobile ? SLOTS.slice(0, 4) : SLOTS).map((s) => {
    const obj = buildInstrument(s.kind, mats);
    obj.scale.setScalar(s.scale);
    comp.add(obj);
    return { s, obj, base: new THREE.Euler(...s.rot) };
  });
  const hp = buildInstrument("handpiece", mats);
  hp.scale.setScalar(HANDPIECE.scale);
  comp.add(hp);
  const hpHomeQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...HANDPIECE.rot));

  // ---- responsive layout ----
  let width = 1, height = 1;
  const layout = { x: 0, y: 0, s: 1, lift: 0 };
  const resize = () => {
    const r = canvas.parentElement!.getBoundingClientRect();
    width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    if (width < 768) { layout.x = 0; layout.y = -0.15; layout.s = Math.min(0.8, visH / 6.4, visW / 6.6); }
    else if (camera.aspect >= 1.15) { layout.x = visW * 0.2; layout.y = -0.1; layout.s = Math.min(1, visW / 13.5); }
    else if (camera.aspect >= 0.8) { layout.x = visW * 0.12; layout.y = -0.6; layout.s = 0.78; }
    else { layout.x = 0; layout.y = -visH * 0.2; layout.s = Math.min(0.62, visW / 7.2); }
    layout.lift = 0;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement!);
  resize();

  // ---- frame loop ----
  const tmp = new THREE.Vector3(), tmpN = new THREE.Vector3(), tipW = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), compQInv = new THREE.Quaternion();
  const basis = new THREE.Matrix4();
  let ps = state.progress, prevPs = ps, px = 0, py = 0;
  let raf = 0, visible = true, last = performance.now(), t = 0;
  const clock = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    return dt;
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const dt = clock();
    const still = state.reduced;
    if (!still) t += dt;
    ps += (state.progress - ps) * (still ? 1 : 0.14);
    px += (state.px - px) * 0.06;
    py += (state.py - py) * 0.06;
    const intro = state.intro;
    const p = ps;

    // phases
    const focus = smooth(seg(p, 0.02, 0.16)) * (1 - smooth(seg(p, 0.8, 0.94)));
    const approach = easeInOut(seg(p, 0.12, 0.32)) * (1 - easeInOut(seg(p, 0.62, 0.74)));
    const drill = seg(p, 0.32, 0.6);
    const sweep = seg(p, 0.62, 0.84);
    // the procedure ends with the restored tooth back at rest (no scatter-out)
    const exit = 0;

    comp.position.set(layout.x, layout.y + layout.lift * focus, 0);
    comp.scale.setScalar(layout.s);
    root.rotation.y = px * 0.18;
    root.rotation.x = -py * 0.1;

    // tooth: clipping-plane reveal + turn
    const ti = easeOut(seg(intro, 0.0, 0.55));
    clip.constant = -1.8 + ti * 3.8; // sweeps upward through the tooth
    toothPivot.scale.setScalar((0.82 + 0.18 * ti) * (1 - 0.42 * exit));
    toothPivot.position.set(0, (1 - ti) * -0.6 + exit * 1.5 + Math.sin(t * 0.8) * 0.05 * (1 - focus), -exit * 3);
    const idle = -1.4 * (1 - ti) + Math.sin(t * 0.35) * 0.35 + 0.6;
    toothPivot.rotation.y = THREE.MathUtils.lerp(idle, faceY, focus) + exit * 1.2;
    toothPivot.rotation.x = 0.22 + 0.26 * focus;
    toothPivot.rotation.z = Math.sin(t * 0.5) * 0.04;

    uniforms.uDecay.value = 1 - smooth(drill);
    uniforms.uWork.value = drill > 0 && drill < 1 ? 1 : 0;
    uniforms.uSweep.value = THREE.MathUtils.lerp(-1.4, 1.4, sweep);
    uniforms.uSweepAmt.value = Math.sin(Math.PI * sweep);

    // instruments: staggered entrance, float, orbit, make room, scatter on exit
    for (const { s, obj, base } of instruments) {
      const k = easeOut(seg(intro, s.delay, s.delay + 0.42));
      const fl = still ? 0 : 1;
      const a = s.orbit ? t * s.orbit : 0;
      const ox = s.pos[0] * Math.cos(a) - s.pos[2] * Math.sin(a);
      const oz = s.pos[0] * Math.sin(a) + s.pos[2] * Math.cos(a);
      const push = 1 + focus * 0.18 + exit * 1.4;
      obj.position.set(
        THREE.MathUtils.lerp(s.from[0], ox * push, k) + px * 0.15 * (oz + 2),
        THREE.MathUtils.lerp(s.from[1], s.pos[1] * push, k) + Math.sin(t * s.freq + s.phase) * s.amp * fl - py * 0.1 * (oz + 2),
        THREE.MathUtils.lerp(s.from[2], oz, k) + Math.cos(t * s.freq * 0.7 + s.phase) * s.amp * 0.5 * fl + exit * 2.5,
      );
      obj.rotation.set(
        base.x + Math.sin(t * s.freq * 0.5 + s.phase) * 0.06 * fl,
        base.y + t * s.spin + (1 - k) * 2.4,
        base.z + Math.cos(t * s.freq * 0.4 + s.phase) * 0.05 * fl + (1 - k) * 1.2 + exit * 0.6 * Math.sign(s.pos[0]),
      );
    }

    // handpiece: home → working pose at the decay spot → home
    const hk = easeOut(seg(intro, HANDPIECE.delay, HANDPIECE.delay + 0.4));
    const homePos = tmp.set(
      THREE.MathUtils.lerp(HANDPIECE.from[0], HANDPIECE.pos[0], hk),
      THREE.MathUtils.lerp(HANDPIECE.from[1], HANDPIECE.pos[1], hk) + Math.sin(t * HANDPIECE.freq) * HANDPIECE.amp,
      THREE.MathUtils.lerp(HANDPIECE.from[2], HANDPIECE.pos[2], hk),
    ).clone();
    homePos.x *= 1 + exit * 1.2; homePos.y += exit * 1.5; homePos.z += exit * 2;
    qa.copy(hpHomeQ).multiply(qb.setFromEuler(new THREE.Euler(0, (1 - hk) * 2, 0)));

    if (approach > 0.001) {
      comp.updateMatrixWorld(true);
      // spot & normal in composition space
      tipW.copy(spot);
      tooth.localToWorld(tipW);
      comp.worldToLocal(tipW);
      tmpN.copy(spotNormal).transformDirection(tooth.matrixWorld);
      comp.getWorldQuaternion(compQInv).invert();
      tmpN.applyQuaternion(compQInv).normalize();
      // orientation: bur (+Z) into the tooth, body (+Y) up and to the right
      const zAxis = tmpN.clone().negate();
      const up = new THREE.Vector3(0.75, 1, 0.55).normalize();
      const yAxis = up.sub(zAxis.clone().multiplyScalar(up.dot(zAxis))).normalize();
      const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
      basis.makeBasis(xAxis, yAxis, zAxis);
      qb.setFromRotationMatrix(basis);
      const tipLocal = (hp.userData.tip as THREE.Vector3).clone().multiplyScalar(HANDPIECE.scale).applyQuaternion(qb);
      const standoff = 0.02 + (1 - smooth(drill)) * 0.025 * (drill > 0 ? 1 : 2);
      const workPos = tipW.clone().addScaledVector(tmpN, standoff).sub(tipLocal);
      if (drill > 0 && drill < 1 && !still) workPos.addScaledVector(tmpN, Math.sin(t * 90) * 0.004);
      hp.position.lerpVectors(homePos, workPos, approach);
      hp.quaternion.slerpQuaternions(qa, qb, approach);
    } else {
      hp.position.copy(homePos);
      hp.quaternion.copy(qa);
    }

    // dust while the bur is working and the page is scrolling
    const working = drill > 0.01 && drill < 0.99 && Math.abs(ps - prevPs) > 0.00015;
    if (working) {
      for (let n = 0; n < 3; n++) {
        const i = dustCursor++ % DUST;
        dustPos[i * 3] = spot.x; dustPos[i * 3 + 1] = spot.y; dustPos[i * 3 + 2] = spot.z;
        const r = () => (Math.random() - 0.5) * 0.9;
        dustVel[i * 3] = (spotNormal.x + r()) * 0.35;
        dustVel[i * 3 + 1] = (spotNormal.y + r() + 0.3) * 0.35;
        dustVel[i * 3 + 2] = (spotNormal.z + r()) * 0.35;
        dustLife[i] = 1;
      }
    }
    for (let i = 0; i < DUST; i++) {
      if (dustLife[i] <= 0) { dustPos[i * 3 + 1] = 99; continue; }
      dustLife[i] -= dt * 1.6;
      dustVel[i * 3 + 1] -= dt * 0.9;
      dustPos[i * 3] += dustVel[i * 3] * dt;
      dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
      dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
    }
    dustGeo.attributes.position.needsUpdate = true;
    prevPs = ps;

    renderer.render(scene, camera);
  };

  // first frame, then reveal the canvas
  frame();
  onReady?.();

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) last = performance.now(); }, { threshold: 0 });
  io.observe(canvas);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    disposeTree(scene);
    Object.values(mats).forEach((m) => m.dispose());
    toothMat.dispose();
    dust.material.dispose();
    env.dispose();
    renderer.dispose();
  };
}

export { clamp01 };
