import * as THREE from "three";
import { addStudioLights, buildInstrument, createRenderer, disposeTree, makeMaterials, studioEnvironment, type Kind } from "./kit";

export type StageItem = {
  kind: Kind;
  /** position in a 10 × 6 frame centred on the origin */
  x: number; y: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  scale?: number;
};
export type StageState = { progress: number; px: number; py: number; reduced: boolean };

/**
 * A small composition of floating instruments. Rendering pauses while the
 * canvas is off-screen; scroll progress (0→1) turns and lifts the set.
 */
export function mountStage(canvas: HTMLCanvasElement, items: StageItem[], state: StageState, opts: { dark?: boolean; spin?: number } = {}) {
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const renderer = createRenderer(canvas, mobile ? 1.5 : 1.75);
  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  addStudioLights(scene, opts.dark);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  const group = new THREE.Group();
  scene.add(group);
  const mats = makeMaterials(opts.dark);
  const objs = items.map((it, i) => {
    const o = buildInstrument(it.kind, mats);
    o.scale.setScalar(it.scale ?? 1);
    group.add(o);
    return { it, o, phase: i * 1.7 };
  });

  let fit = 1;
  const resize = () => {
    const r = canvas.parentElement!.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    fit = Math.min(1.25, (visH * camera.aspect) / 10, visH / 6);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement!);
  resize();

  let raf = 0, visible = false, t = 0, last = performance.now(), ps = state.progress, px = 0, py = 0;
  const spin = opts.spin ?? 1;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!state.reduced) t += dt;
    ps += (state.progress - ps) * 0.12;
    px += (state.px - px) * 0.06;
    py += (state.py - py) * 0.06;
    group.scale.setScalar(fit);
    group.rotation.y = (ps - 0.5) * 0.9 * spin + px * 0.2;
    group.rotation.x = -py * 0.12;
    for (const { it, o, phase } of objs) {
      const z = it.z ?? 0;
      o.position.set(it.x, it.y + Math.sin(t * 0.7 + phase) * 0.08 + (ps - 0.5) * (z + 1) * -0.6, z);
      o.rotation.set(
        (it.rx ?? 0) + Math.sin(t * 0.4 + phase) * 0.05,
        (it.ry ?? 0) + t * 0.12 * spin + (ps - 0.5) * 1.2 * spin,
        (it.rz ?? 0) + Math.cos(t * 0.3 + phase) * 0.04,
      );
    }
    renderer.render(scene, camera);
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }, { rootMargin: "120px" });
  io.observe(canvas);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    disposeTree(scene);
    Object.values(mats).forEach((m) => m.dispose());
    env.dispose();
    renderer.dispose();
  };
}
